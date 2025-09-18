# Sistema de Inspeção Elétrica

Aplicativo móvel para inspeções elétricas com geração automática de relatórios PDF.

## Funcionalidades

### 📱 Aplicativo Mobile
- **Autenticação**: Sistema de login seguro
- **Inspeções**: Criação e gerenciamento de inspeções elétricas
- **Módulos**: 11 módulos especializados de coleta de dados
- **Offline**: Funcionamento completo offline com sincronização
- **Fotos**: Captura e anexo de evidências fotográficas
- **GPS**: Localização automática das inspeções

### 📄 Geração de Relatórios PDF
- **Automática**: Geração de relatórios profissionais em PDF
- **Versionamento**: Sistema de versões que preserva histórico completo
- **Nomenclatura Inteligente**: Arquivos nomeados como `{cliente}_{data}_v{versao}.pdf`
- **Template Personalizado**: Layout baseado no modelo "APP DO PATRÃO"
- **Dados Estruturados**: Coleta e organização automática dos dados
- **Imagens**: Inclusão automática de fotos em grid 2x2
- **Sumário Navegável**: Índice com links para seções
- **Padrão Técnico**: Formatação profissional com cabeçalho e rodapé

### 📧 Sistema de Envio e Armazenamento
- **Envio Automático**: E-mails com relatórios para contatos especificados
- **Templates Profissionais**: E-mails HTML responsivos com identidade visual
- **Política de Retry**: Tentativas automáticas em caso de falha no envio
- **Logs Detalhados**: Rastreamento completo de exportações e envios
- **Histórico Preservado**: Todas as versões são mantidas permanentemente
- **Storage Seguro**: Armazenamento no Supabase com URLs públicas

## Módulos de Inspeção

1. **Cliente/Obra** - Dados básicos do cliente, localização, horários e responsáveis
2. **Tipo de Cabine** - Especificações técnicas, tipo de instalação e aterramento
3. **Procedimentos** - Checklist completo de segurança e procedimentos operacionais
4. **Manutenção** - Histórico detalhado, frequência e planejamento de manutenções
5. **Transformadores** - Dados técnicos completos, ensaios elétricos e medições
6. **Conexão Concessionária** - Interface com rede, medidores e tarifação
7. **Média Tensão (MT)** - Sistema de distribuição MT com medições trifásicas
8. **Baixa Tensão (BT)** - Sistema de distribuição BT com medições completas
9. **EPCs** - Equipamentos de proteção coletiva e sistemas de segurança
10. **Estado Geral** - Avaliação final, conformidade e recomendações
11. **Religamento** - Procedimentos de religamento e testes finais

## Tecnologias

### Frontend (React Native + Expo)
- **Expo Router** - Navegação baseada em arquivos
- **SQLite** - Banco de dados local
- **AsyncStorage** - Armazenamento de preferências
- **Expo Camera** - Captura de fotos
- **Expo Location** - GPS e geolocalização

### Backend (Supabase)
- **Edge Functions** - Processamento serverless
- **Storage** - Armazenamento de arquivos
- **Database** - PostgreSQL para sincronização

### Geração de PDF
- **pdf-lib** - Criação programática de PDFs
- **Layout Responsivo** - Adaptação automática de conteúdo
- **Fontes Helvetica** - Tipografia profissional
- **Cores Corporativas** - Azul escuro (#003366) e cinza claro

## Estrutura do Relatório PDF

### Capa
- Logo e título centralizados
- Subtítulo com detalhes da inspeção
- Data de emissão e responsável técnico
- Indicador de versão e modo (padrão/enriquecido)

### Sumário
- Índice navegável com numeração de páginas
- Links diretos para cada seção

### Seções Principais
1. **Dados Iniciais** - Informações do cliente e obra
2. **Procedimentos Iniciais** - Checklist de segurança
3. **Ensaios e Resultados** - Medições técnicas
4. **Checklists e Fotos** - Evidências visuais
5. **Transformadores e Componentes** - Equipamentos
6. **Conclusão** - Avaliação final
7. **Anexos** - Documentos complementares

### Formatação
- **Página**: A4, retrato, margens 25mm
- **Fontes**: Helvetica (12pt corpo, 14pt seções, 16pt títulos)
- **Espaçamento**: 1.5 entre linhas
- **Imagens**: Grid 2x2, máximo 80x60mm
- **Cabeçalho**: Logo + numeração de páginas
- **Rodapé**: Dados de contato da empresa

## Como Usar

### 1. Criar Nova Inspeção
```typescript
// Na tela inicial, toque em "+" para criar nova inspeção
// Preencha os dados básicos: cliente, obra, endereço
// Use GPS para capturar localização automaticamente
```

### 2. Preencher Módulos
```typescript
// Navegue pelos 11 módulos de inspeção
// Preencha campos obrigatórios (marcados com *)
// Capture fotos quando necessário
// Dados são salvos automaticamente
```

### 3. Gerar Relatório PDF
```typescript
// Após completar a inspeção, toque em "Gerar Relatório PDF"
// OU use o fluxo otimizado: "Nova (Otimizada)" → Fotos → Checklist → Revisão → Relatório
// Escolha entre modo padrão ou enriquecido
// Opte por enviar por e-mail ou apenas gerar
// O sistema coleta todos os dados automaticamente
// PDF é gerado com versionamento automático
// E-mail é enviado automaticamente se solicitado
// Histórico completo fica disponível na interface
```

### 4. Fluxo Otimizado (Novo)
```typescript
// Fluxo linear otimizado para maior eficiência:
// 1. Dados Iniciais - Metadados + especificações técnicas em uma tela
// 2. Fotos Obrigatórias - 4 fotos essenciais com guias visuais
// 3. Checklist Preventivo - Itens baseados no tipo de cabine
// 4. Ações Corretivas - Revisão e gestão de problemas
// 5. Revisão Final - Conclusão, assinatura e validação
// 6. Geração de Relatório - Opções de exportação e envio

// Melhorias implementadas:
// - Validações inline em tempo real
// - Microcopy contextual para orientação
// - Economia de cliques com ações agrupadas
// - Salvamento automático de rascunho
// - Feedback visual de progresso
// - Fallback para fluxo original
```

### 4. Gerenciar Histórico de Exportações
```typescript
// Acesse "Histórico de Exportações" na tela da inspeção
// Visualize todas as versões geradas
// Baixe versões anteriores quando necessário
// Monitore status de envios de e-mail
// Execute retry de exportações falhadas
```

## Configuração do Ambiente

### Variáveis de Ambiente
```env
EXPO_PUBLIC_SUPABASE_URL=sua_url_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima

# Configurações de E-mail (Edge Functions)
EMAIL_SERVICE_URL=https://api.sendgrid.com/v3/mail/send
EMAIL_SERVICE_API_KEY=sua_chave_sendgrid
FROM_EMAIL=noreply@joule.com.br
FROM_NAME=Joule - Inspeção Elétrica
```

### Supabase Setup
1. Crie um projeto no Supabase
2. Configure o bucket 'reports' no Storage
3. Deploy da Edge Function 'generate-report'
4. Deploy da Edge Function 'send-report-email'
5. Deploy da Edge Function 'retry-export'
4. Configure as políticas de acesso
6. Execute a migration para criar tabela export_logs

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build:web
npm run build:android
npm run build:ios

# Executar testes
npm test
npm run test:watch
```

## Testes

### Executar Testes Unitários
```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com interface visual
npm run test:ui
```

### Cenários de Teste Implementados

#### Validação Final do Relatório
1. **Sucesso Total**: Todos os campos e fotos obrigatórios presentes
2. **Campo Obrigatório Ausente**: Validação falha quando campo required está vazio
3. **Foto Obrigatória Ausente**: Validação falha quando foto required não foi capturada
4. **Autorização Não Concedida**: Erro crítico quando autorização não está marcada
5. **Conclusão Vazia**: Erro crítico quando conclusão não foi preenchida
6. **Campo "Outro" Não Especificado**: Validação falha quando "Outro" é selecionado mas não especificado
7. **Erro de Database**: Tratamento gracioso de erros de conexão

#### Integração com Geração de Relatório
1. **Prevenção de Geração**: Relatório não é gerado quando validação falha
2. **Geração Bem-sucedida**: Relatório é gerado quando validação passa
3. **Validação de Módulo**: Validações de nível de módulo continuam funcionando independentemente

### Executar Testes Específicos
```bash
# Testar apenas validação final
npm test -- --grep "validateFinalReport"

# Testar integração de validação
npm test -- --grep "validation integration"

# Testar validação de módulos
npm test -- --grep "module-level validation"
```

## Estrutura de Dados

### Objeto Relatório
```typescript
interface ReportObject {
  metadados: {
    titulo: string;
    subtitulo: string;
    data_emissao: string;
    autor: string;
  };
  dados_iniciais: {
    cliente: string;
    nome_fantasia: string;
    endereco: string;
    horario_chegada: string;
    responsavel_local: string;
    data_execucao: string;
    os_numero: string;
    // ... outros campos
  };
  checklists: Array<{
    secao: string;
    descricao: string;
    resultado: 'CONFORME' | 'NÃO CONFORME';
    foto_ids: string[];
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
    serie: string;
    potencia_kva: number;
    ano_fabricacao: number;
    oleo_litros: number;
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
  // ... outras seções
}
```

## Licença

Este projeto é proprietário e confidencial.

## Suporte

Para suporte técnico, entre em contato:
- Email: contato@joule.com.br
- Telefone: +55 11 2381-0838
- Endereço: Rua Baffin, 335 • Jardim do Mar • CEP 09750-620 • São Bernardo do Campo • SP