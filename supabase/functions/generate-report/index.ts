import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'npm:pdf-lib@1.17.1';

interface GenerateReportRequest {
  inspection_id: string;
  mode?: 'compatibility' | 'enriched';
  recipient_emails?: string[];
  send_email?: boolean;
}

interface ExportLogEntry {
  id: string;
  inspection_id: string;
  user_id: string;
  report_type: 'PDF' | 'JSON';
  file_name: string;
  version: number;
  recipient_emails: string[];
  metadata: Record<string, any>;
}

interface ReportObject {
  metadados: {
    titulo: string;
    subtitulo: string;
    data_emissao: string;
    autor: string;
    logo_path?: string;
  };
  dados_iniciais: {
    cliente: string;
    nome_fantasia?: string;
    endereco: string;
    horario_chegada: string;
    responsavel_local: string;
    data_execucao: string;
    os_numero: string;
    concessionaria: string;
    demanda_kw: number;
    codigo_consumidor: string;
  };
  checklists: Array<{
    secao: string;
    descricao: string;
    resultado: string | boolean;
    foto_ids: string[];
    video_url?: string;
  }>;
  ensaios: Array<{
    tipo: string;
    parametros: Record<string, any>;
    valores: Record<string, any>;
    resultados_normativos: Record<string, any>;
  }>;
  transformadores: Array<{
    id: string;
    fabricante: string;
    oleo_litros: number;
    ano_fabricacao: number;
    serie: string;
    potencia_kva: number;
    peso_kg: number;
    taps: Array<{
      posicao: number;
      tensao: number;
      percentual: number;
    }>;
    vazamento: boolean;
    fotos: string[];
    ensaios: Array<{
      tipo: string;
      valores: Record<string, number>;
      resultado: 'aprovado' | 'reprovado' | 'atencao';
    }>;
  }>;
  componentes: Array<{
    tipo: string;
    descricao: string;
    irregularidade: boolean;
    fotos: string[];
    videos: string[];
  }>;
  conclusao: string;
  anexos: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData: GenerateReportRequest = await req.json();
    const { inspection_id, mode = 'compatibility', recipient_emails = [], send_email = true } = requestData;

    // Configurar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados da inspeção para construir nome do arquivo
    const { data: inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .select('id, client_name, created_at, user_id')
      .eq('id', inspection_id)
      .single();

    if (inspectionError || !inspectionData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Inspeção não encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar data de execução do módulo client
    const { data: clientModuleData } = await supabase
      .from('module_data')
      .select('field_value')
      .eq('inspection_id', inspection_id)
      .eq('module_type', 'client')
      .eq('field_name', 'data_execucao')
      .single();

    // Construir prefixo do arquivo
    const clientName = sanitizeFileName(inspectionData.client_name);
    const inspectionDate = clientModuleData?.field_value 
      ? formatDateForFileName(clientModuleData.field_value)
      : formatDateForFileName(inspectionData.created_at);
    
    const filePrefix = `${clientName}_${inspectionDate}`;

    // Determinar próxima versão consultando Storage
    const nextVersion = await getNextVersion(supabase, filePrefix);

    // Construir nomes dos arquivos
    const pdfFileName = `${filePrefix}_v${nextVersion}.pdf`;
    const jsonFileName = `${filePrefix}_v${nextVersion}.json`;

    // Criar registro inicial no export_logs
    const exportLogId = await createExportLog(supabase, {
      inspection_id,
      user_id: inspectionData.user_id,
      report_type: 'PDF',
      file_name: pdfFileName,
      version: nextVersion,
      recipient_emails,
      metadata: {
        mode,
        client_name: inspectionData.client_name,
        inspection_date: inspectionDate,
        send_email,
      },
    });

    // Coletar dados para o relatório
    const relatorio = await collectReportData(supabase, inspection_id, mode);

    if (!relatorio) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível coletar dados da inspeção' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Gerar PDF
    const pdfBytes = await generatePDF(relatorio, mode);

    // Gerar JSON do relatório
    const jsonData = JSON.stringify(relatorio, null, 2);
    const jsonBytes = new TextEncoder().encode(jsonData);

    // Upload do PDF para o Storage
    const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
      .from('reports')
      .upload(pdfFileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (pdfUploadError) {
      await updateExportLogError(supabase, exportLogId, `Erro no upload do PDF: ${pdfUploadError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar PDF no storage' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Upload do JSON para o Storage
    const { data: jsonUploadData, error: jsonUploadError } = await supabase.storage
      .from('reports')
      .upload(jsonFileName, jsonBytes, {
        contentType: 'application/json',
        upsert: false,
      });

    if (jsonUploadError) {
      console.warn('Erro no upload do JSON:', jsonUploadError);
    }

    // Atualizar export_logs com sucesso do upload
    await updateExportLogUploaded(supabase, exportLogId, `reports/${pdfFileName}`);

    // Obter URLs públicas
    const { data: pdfUrlData } = supabase.storage
      .from('reports')
      .getPublicUrl(pdfFileName);

    const { data: jsonUrlData } = supabase.storage
      .from('reports')
      .getPublicUrl(jsonFileName);

    // Enviar por e-mail se solicitado
    if (send_email && recipient_emails.length > 0) {
      try {
        await sendReportEmail(supabase, {
          export_log_id: exportLogId,
          inspection_id,
          pdf_url: pdfUrlData.publicUrl,
          json_url: jsonUrlData.publicUrl,
          client_name: inspectionData.client_name,
          inspection_date: inspectionDate,
          version: nextVersion,
          recipients: recipient_emails,
          os_number: relatorio.dados_iniciais.os_numero,
        });
      } catch (emailError) {
        console.error('Erro no envio de e-mail:', emailError);
        await updateExportLogError(supabase, exportLogId, `Erro no envio de e-mail: ${emailError.message}`);
      }
    } else {
      // Marcar como sucesso se não precisar enviar e-mail
      await updateExportLogSuccess(supabase, exportLogId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrlData.publicUrl,
        json_url: jsonUrlData.publicUrl,
        file_name: pdfFileName,
        version: nextVersion,
        export_log_id: exportLogId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na geração do PDF:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Função para sanitizar nome do cliente para uso em nome de arquivo
function sanitizeFileName(clientName: string): string {
  return clientName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .substring(0, 50); // Limita tamanho
}

// Função para formatar data para nome de arquivo
function formatDateForFileName(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

// Função para determinar próxima versão consultando Storage
async function getNextVersion(supabase: any, filePrefix: string): Promise<number> {
  try {
    // Listar arquivos no bucket que começam com o prefixo
    const { data: files, error } = await supabase.storage
      .from('reports')
      .list('', {
        search: filePrefix,
      });

    if (error) {
      console.warn('Erro ao listar arquivos para versionamento:', error);
      return 1; // Fallback para versão 1
    }

    if (!files || files.length === 0) {
      return 1; // Primeira versão
    }

    // Extrair números de versão dos nomes dos arquivos
    const versions = files
      .map(file => {
        const match = file.name.match(/_v(\d+)\.(pdf|json)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(version => version > 0);

    if (versions.length === 0) {
      return 1;
    }

    return Math.max(...versions) + 1;
  } catch (error) {
    console.error('Erro ao determinar próxima versão:', error);
    return 1; // Fallback seguro
  }
}

// Função para criar registro inicial no export_logs
async function createExportLog(supabase: any, logData: Omit<ExportLogEntry, 'id'>): Promise<string> {
  const { data, error } = await supabase
    .from('export_logs')
    .insert({
      inspection_id: logData.inspection_id,
      user_id: logData.user_id,
      report_type: logData.report_type,
      file_name: logData.file_name,
      version: logData.version,
      recipient_emails: logData.recipient_emails,
      status: 'pending',
      metadata: logData.metadata,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao criar log de exportação: ${error.message}`);
  }

  return data.id;
}

// Função para atualizar export_logs após upload bem-sucedido
async function updateExportLogUploaded(supabase: any, logId: string, filePath: string): Promise<void> {
  const { error } = await supabase
    .from('export_logs')
    .update({
      uploaded_at: new Date().toISOString(),
      file_path: filePath,
      status: 'uploaded',
    })
    .eq('id', logId);

  if (error) {
    console.error('Erro ao atualizar log de upload:', error);
  }
}

// Função para atualizar export_logs com erro
async function updateExportLogError(supabase: any, logId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('export_logs')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', logId);

  if (error) {
    console.error('Erro ao atualizar log de erro:', error);
  }
}

// Função para marcar export_logs como sucesso
async function updateExportLogSuccess(supabase: any, logId: string): Promise<void> {
  const { error } = await supabase
    .from('export_logs')
    .update({
      status: 'success',
    })
    .eq('id', logId);

  if (error) {
    console.error('Erro ao atualizar log de sucesso:', error);
  }
}

// Função para coletar dados da inspeção e montar objeto do relatório
async function collectReportData(supabase: any, inspectionId: string, mode: string): Promise<ReportObject | null> {
  try {
    // Buscar dados da inspeção
    const { data: inspection } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (!inspection) return null;

    // Buscar dados dos módulos
    const { data: moduleData } = await supabase
      .from('module_data')
      .select('*')
      .eq('inspection_id', inspectionId);

    // Buscar fotos
    const { data: mediaFiles } = await supabase
      .from('media_files')
      .select('*')
      .eq('inspection_id', inspectionId)
      .like('file_type', 'image/%');

    // Organizar dados por módulo
    const modulesByType: Record<string, Record<string, string>> = {};
    moduleData?.forEach((item: any) => {
      if (!modulesByType[item.module_type]) {
        modulesByType[item.module_type] = {};
      }
      modulesByType[item.module_type][item.field_name] = item.field_value;
    });

    // Construir objeto do relatório
    const relatorio: ReportObject = {
      metadados: {
        titulo: 'RELATÓRIO DE INSPEÇÃO ELÉTRICA',
        subtitulo: `Cliente: ${inspection.client_name} - Local: ${inspection.work_site}`,
        data_emissao: new Date().toISOString(),
        autor: 'Sistema de Inspeção Elétrica',
      },
      dados_iniciais: {
        cliente: modulesByType.client?.client_name || inspection.client_name,
        nome_fantasia: modulesByType.client?.nome_fantasia,
        endereco: modulesByType.client?.endereco_completo || inspection.address || '',
        horario_chegada: modulesByType.client?.horario_chegada || '',
        responsavel_local: modulesByType.client?.responsavel_local || '',
        data_execucao: modulesByType.client?.data_execucao || inspection.created_at,
        os_numero: modulesByType.client?.os_number || `AUTO-${inspectionId.slice(-8)}`,
        concessionaria: modulesByType.grid_connection?.concessionaria || 'N/A',
        demanda_kw: parseFloat(modulesByType.grid_connection?.demanda_kw || '0'),
        codigo_consumidor: modulesByType.grid_connection?.codigo_consumidor || 'N/A',
      },
      checklists: [],
      ensaios: [],
      transformadores: [],
      componentes: [],
      conclusao: modulesByType.general_state?.conclusion || 'Conclusão não informada',
      anexos: mediaFiles?.map((file: any) => file.file_path) || [],
    };

    return relatorio;
  } catch (error) {
    console.error('Erro ao coletar dados do relatório:', error);
    return null;
  }
}

// Função para enviar relatório por e-mail
async function sendReportEmail(supabase: any, emailData: {
  export_log_id: string;
  inspection_id: string;
  pdf_url: string;
  json_url: string;
  client_name: string;
  inspection_date: string;
  version: number;
  recipients: string[];
  os_number: string;
}): Promise<void> {
  // Atualizar status para "enviando e-mail"
  await supabase
    .from('export_logs')
    .update({
      status: 'sending_email',
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', emailData.export_log_id);

  // Chamar Edge Function de envio de e-mail
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-report-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    throw new Error(`Falha no envio de e-mail: ${response.status}`);
  }

  // Marcar como sucesso
  await updateExportLogSuccess(supabase, emailData.export_log_id);
}

async function generatePDF(relatorio: ReportObject, mode: 'compatibility' | 'enriched' = 'compatibility'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  
  const isEnriched = mode === 'enriched';

  // Cores
  const primaryColor = rgb(0, 0.2, 0.4); // #003366
  const tableHeaderColor = rgb(0.94, 0.94, 0.94); // #F0F0F0

  // Configurações de página
  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const margin = 71; // 25mm em pontos (25 * 2.834)

  let currentPage = pdfDoc.addPage(PageSizes.A4);
  let yPosition = pageHeight - margin;
  let pageNumber = 1;
  const sections: Array<{ title: string; page: number }> = [];

  // Função para adicionar nova página
  const addNewPage = () => {
    currentPage = pdfDoc.addPage(PageSizes.A4);
    yPosition = pageHeight - margin;
    pageNumber++;
    addHeaderFooter(currentPage, pageNumber, helveticaFont, primaryColor, pageWidth, pageHeight, margin);
  };

  // Função para adicionar cabeçalho e rodapé (páginas internas)
  const addHeaderFooter = (page: any, pageNum: number, font: any, color: any, width: number, height: number, margin: number) => {
    if (pageNum > 1) {
      // Cabeçalho
      page.drawText('Joule', {
        x: margin,
        y: height - 30,
        size: 12,
        font: font,
        color: color,
      });
      
      page.drawText(`Página ${pageNum}`, {
        x: width - margin - 60,
        y: height - 30,
        size: 10,
        font: font,
        color: color,
      });

      // Linha separadora do cabeçalho
      page.drawLine({
        start: { x: margin, y: height - 40 },
        end: { x: width - margin, y: height - 40 },
        thickness: 1,
        color: color,
      });

      // Rodapé
      const footerText = 'Rua Baffin, 335 • Jardim do Mar • CEP 09750-620 • São Bernardo do Campo • SP • Tel: +55 11 2381-0838 • contato@joule.com.br';
      const footerWidth = font.widthOfTextAtSize(footerText, 8);
      
      page.drawText(footerText, {
        x: (width - footerWidth) / 2,
        size: 8,
        font: font,
        color: color,
      });

      // Linha separadora do rodapé
      page.drawLine({
        start: { x: margin, y: 45 },
        end: { x: width - margin, y: 45 },
        thickness: 1,
        color: color,
      });
    }
  };

  // CAPA
  currentPage.drawText(relatorio.metadados.titulo, {
    x: (pageWidth - helveticaBold.widthOfTextAtSize(relatorio.metadados.titulo, 20)) / 2,
    y: pageHeight / 2 + 100,
    size: 20,
    font: helveticaBold,
    color: primaryColor,
  });

  currentPage.drawText(relatorio.metadados.subtitulo, {
    x: (pageWidth - helveticaItalic.widthOfTextAtSize(relatorio.metadados.subtitulo, 14)) / 2,
    y: pageHeight / 2 + 60,
    size: 14,
    font: helveticaItalic,
    color: primaryColor,
  });
  
  // Indicador de modo (apenas para modo enriquecido)
  if (isEnriched) {
    currentPage.drawText('MODO ENRIQUECIDO', {
      x: pageWidth - margin - 100,
      y: pageHeight - 50,
      size: 8,
      font: helveticaFont,
      color: primaryColor,
    });
  }

  // Data e autor no rodapé da capa
  const dataText = `Data: ${new Date(relatorio.metadados.data_emissao).toLocaleDateString('pt-BR')}`;
  const autorText = `Responsável: ${relatorio.metadados.autor}`;
  
  currentPage.drawText(dataText, {
    x: (pageWidth - helveticaFont.widthOfTextAtSize(dataText, 12)) / 2,
    y: 100,
    size: 12,
    font: helveticaFont,
  });

  currentPage.drawText(autorText, {
    x: (pageWidth - helveticaFont.widthOfTextAtSize(autorText, 12)) / 2,
    y: 80,
    size: 12,
    font: helveticaFont,
  });

  // SUMÁRIO (página 2)
  addNewPage();
  sections.push({ title: 'Sumário', page: pageNumber });
  
  yPosition -= 20;
  currentPage.drawText('SUMÁRIO', {
    x: margin,
    y: yPosition,
    size: 16,
    font: helveticaBold,
    color: primaryColor,
  });

  yPosition -= 40;
  const summaryItems = [
    '1. Dados Iniciais',
    '2. Procedimentos Iniciais',
    '3. Ensaios e Resultados',
    ...(isEnriched ? ['4. Histórico de Manutenção'] : []),
    `${isEnriched ? '5' : '4'}. Transformadores`,
    `${isEnriched ? '6' : '5'}. Irregularidades`,
    `${isEnriched ? '7' : '6'}. Conclusão`,
    `${isEnriched ? '8' : '7'}. Anexos`
  ];

  summaryItems.forEach((item, index) => {
    currentPage.drawText(item, {
      x: margin + 20,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    });
    
    currentPage.drawText(`${index + 3}`, {
      x: pageWidth - margin - 30,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    });
    
    yPosition -= 25;
  });

  // SEÇÃO 1: DADOS INICIAIS
  addNewPage();
  sections.push({ title: '1. Dados Iniciais', page: pageNumber });
  
  yPosition -= 20;
  currentPage.drawText('1. DADOS INICIAIS', {
    x: margin,
    y: yPosition,
    size: 16,
    font: helveticaBold,
    color: primaryColor,
  });

  yPosition -= 40;
  const dadosIniciais = [
    ['Cliente:', relatorio.dados_iniciais.cliente],
    ['Nome Fantasia:', relatorio.dados_iniciais.nome_fantasia || 'N/A'],
    ['Endereço:', relatorio.dados_iniciais.endereco],
    ['Horário de Chegada:', relatorio.dados_iniciais.horario_chegada],
    ['Responsável Local:', relatorio.dados_iniciais.responsavel_local],
    ['Data de Execução:', relatorio.dados_iniciais.data_execucao],
    ['OS Número:', relatorio.dados_iniciais.os_numero],
    ['Concessionária:', relatorio.dados_iniciais.concessionaria],
    ['Demanda (kW):', relatorio.dados_iniciais.demanda_kw.toString()],
    ['Código do Consumidor:', relatorio.dados_iniciais.codigo_consumidor],
  ];

  dadosIniciais.forEach(([label, value]) => {
    currentPage.drawText(label, {
      x: margin,
      y: yPosition,
      size: 12,
      font: helveticaBold,
    });
    
    currentPage.drawText(value, {
      x: margin + 150,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    });
    
    yPosition -= 25;
  });

  // SEÇÃO 2: PROCEDIMENTOS INICIAIS
  addNewPage();
  sections.push({ title: '2. Procedimentos Iniciais', page: pageNumber });
  
  yPosition -= 20;
  currentPage.drawText('2. PROCEDIMENTOS INICIAIS', {
    x: margin,
    y: yPosition,
    size: 16,
    font: helveticaBold,
    color: primaryColor,
  });

  yPosition -= 40;
  relatorio.checklists
    .filter(item => item.secao === 'Procedimentos Iniciais')
    .forEach((item) => {
      currentPage.drawText(`• ${item.descricao}`, {
        x: margin + 10,
        y: yPosition,
        size: 12,
        font: helveticaFont,
      });
      
      const resultado = item.resultado;
      
      currentPage.drawText(resultado, {
        x: pageWidth - margin - 80,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: item.resultado === 'CONFORME' ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0),
      });
      
      yPosition -= 25;
      
      if (yPosition < margin + 50) {
        addNewPage();
        yPosition -= 20;
      }
    });

  // SEÇÃO 2.1: EQUIPAMENTOS DE PROTEÇÃO COLETIVA
  if (relatorio.checklists.some(item => item.secao === 'Equipamentos de Proteção Coletiva')) {
    yPosition -= 30;
    if (yPosition < margin + 100) {
      addNewPage();
      yPosition -= 20;
    }
    
    currentPage.drawText('2.1. EQUIPAMENTOS DE PROTEÇÃO COLETIVA', {
      x: margin,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: primaryColor,
    });

    yPosition -= 30;
    relatorio.checklists
      .filter(item => item.secao === 'Equipamentos de Proteção Coletiva')
      .forEach((item) => {
        currentPage.drawText(`• ${item.descricao}`, {
          x: margin + 10,
          y: yPosition,
          size: 12,
          font: helveticaFont,
        });
        
        const resultColor = item.resultado === 'PRESENTE' ? rgb(0, 0.6, 0) : 
                           item.resultado === 'AUSENTE NA INSTALAÇÃO' ? rgb(0.6, 0.6, 0.6) : 
                           rgb(0.8, 0, 0);
        
        currentPage.drawText(item.resultado, {
          x: pageWidth - margin - 80,
          y: yPosition,
          size: 12,
          font: helveticaBold,
          color: resultColor,
        });
        
        yPosition -= 25;
        
        if (yPosition < margin + 50) {
          addNewPage();
          yPosition -= 20;
        }
      });
  }

  // SEÇÃO 3: ENSAIOS E RESULTADOS
  addNewPage();
  sections.push({ title: '3. Ensaios e Resultados', page: pageNumber });
  
  yPosition -= 20;
  currentPage.drawText('3. ENSAIOS E RESULTADOS', {
    x: margin,
    y: yPosition,
    size: 16,
    font: helveticaBold,
    color: primaryColor,
  });

  yPosition -= 40;
  relatorio.ensaios.forEach((ensaio) => {
    currentPage.drawText(`Ensaio: ${ensaio.tipo}`, {
      x: margin,
      y: yPosition,
      size: 14,
      font: helveticaBold,
    });
    
    yPosition -= 30;
    
    Object.entries(ensaio.valores).forEach(([param, valor]) => {
      currentPage.drawText(`${param}: ${valor}`, {
        x: margin + 20,
        y: yPosition,
        size: 12,
        font: helveticaFont,
      });
      
      yPosition -= 20;
    });
    
    yPosition -= 20;
    
    if (yPosition < margin + 100) {
      addNewPage();
      yPosition -= 20;
    }
  });

  // SEÇÃO 4: TRANSFORMADORES
  if (relatorio.transformadores.length > 0) {
    addNewPage();
    sections.push({ title: '4. Transformadores', page: pageNumber });
    
    yPosition -= 20;
    currentPage.drawText('4. TRANSFORMADORES', {
      x: margin,
      y: yPosition,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });

    yPosition -= 40;
    relatorio.transformadores.forEach((transformador, index) => {
      currentPage.drawText(`Transformador ${index + 1}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBold,
      });
      
      yPosition -= 30;
      
      const transformadorData = [
        ['Fabricante:', transformador.fabricante],
        ['Série:', transformador.serie],
        ['Potência:', `${transformador.potencia_kva} kVA`],
        ['Peso:', `${transformador.peso_kg} kg`],
        ['Óleo:', `${transformador.oleo_litros} litros`],
        ['Ano:', transformador.ano_fabricacao.toString()],
        ['Vazamento:', transformador.vazamento ? 'SIM' : 'NÃO'],
      ];
      
      transformadorData.forEach(([label, value]) => {
        currentPage.drawText(label, {
          x: margin + 20,
          y: yPosition,
          size: 12,
          font: helveticaBold,
        });
        
        currentPage.drawText(value, {
          x: margin + 120,
          y: yPosition,
          size: 12,
          font: helveticaFont,
        });
        
        yPosition -= 20;
      });
      
      yPosition -= 20;
      
      if (yPosition < margin + 150) {
        addNewPage();
        yPosition -= 20;
      }
    });
  }

  // SEÇÃO 5: IRREGULARIDADES DE COMPONENTES
  const irregularidades = relatorio.componentes.filter(comp => comp.irregularidade);
  if (irregularidades.length > 0) {
    addNewPage();
    sections.push({ title: '5. Irregularidades de Componentes', page: pageNumber });
    
    yPosition -= 20;
    currentPage.drawText('5. IRREGULARIDADES DE COMPONENTES', {
      x: margin,
      y: yPosition,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });

    yPosition -= 40;
    irregularidades.forEach((irregularidade, index) => {
      // Título da irregularidade
      currentPage.drawText(`${index + 1}. ${irregularidade.tipo}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0.8, 0, 0), // Vermelho para destacar irregularidades
      });
      
      yPosition -= 30;
      
      // Descrição detalhada
      const descricaoLines = wrapText(irregularidade.descricao, 85);
      descricaoLines.forEach((line) => {
        currentPage.drawText(line, {
          x: margin + 10,
          y: yPosition,
          size: 11,
          font: helveticaFont,
        });
        
        yPosition -= 18;
        
        if (yPosition < margin + 100) {
          addNewPage();
          yPosition -= 20;
        }
      });
      
      yPosition -= 20;
      
      if (yPosition < margin + 150) {
        addNewPage();
        yPosition -= 20;
      }
    });
  }

  // SEÇÃO 6: CONCLUSÃO
  addNewPage();
  sections.push({ title: `${isEnriched ? '7' : '6'}. Conclusão`, page: pageNumber });
  
  yPosition -= 20;
  currentPage.drawText(`${isEnriched ? '7' : '6'}. CONCLUSÃO`, {
    x: margin,
    y: yPosition,
    size: 16,
    font: helveticaBold,
    color: primaryColor,
  });

  yPosition -= 40;
  
  // Quebrar texto da conclusão em linhas
  const conclusaoLines = wrapText(relatorio.conclusao, 90);
  conclusaoLines.forEach((line) => {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    });
    
    yPosition -= 20;
  });
  
  // Adicionar seção de assinaturas e carimbos
  yPosition -= 40;
  
  if (yPosition < margin + 150) {
    addNewPage();
    yPosition -= 20;
  }
  
  // Linha separadora
  currentPage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: primaryColor,
  });
  
  yPosition -= 30;
  
  // Assinatura digital
  currentPage.drawText('ASSINATURA DIGITAL:', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBold,
  });
  
  yPosition -= 25;
  currentPage.drawText(`Responsável Técnico: ${relatorio.metadados.autor}`, {
    x: margin + 10,
    y: yPosition,
    size: 11,
    font: helveticaFont,
  });
  
  // Carimbo VALIDADO (centralizado)
  yPosition -= 40;
  const validadoText = 'VALIDADO';
  const validadoWidth = helveticaBold.widthOfTextAtSize(validadoText, 14);
  const validadoX = (pageWidth - validadoWidth) / 2;
  
  // Desenhar retângulo do carimbo
  currentPage.drawRectangle({
    x: validadoX - 20,
    y: yPosition - 10,
    width: validadoWidth + 40,
    height: 40,
    borderColor: primaryColor,
    borderWidth: 2,
  });
  
  currentPage.drawText(validadoText, {
    x: validadoX,
    y: yPosition + 5,
    size: 14,
    font: helveticaBold,
    color: primaryColor,
  });
  
  currentPage.drawText(new Date().toLocaleDateString('pt-BR'), {
    x: validadoX + 5,
    y: yPosition - 8,
    size: 10,
    font: helveticaFont,
    color: primaryColor,
  });
  
  // Carimbo técnico (direita)
  yPosition -= 20;
  currentPage.drawText('CARIMBO TÉCNICO: CREA-SP 123456789', {
    x: pageWidth - margin - 200,
    y: yPosition,
    size: 10,
    font: helveticaFont,
  });

  return await pdfDoc.save();
}

// Função auxiliar para quebrar texto em linhas
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}