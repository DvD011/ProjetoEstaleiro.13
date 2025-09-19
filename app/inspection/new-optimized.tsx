import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useInspections } from '@/hooks/useInspections';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Building, FileText, Save, Navigation, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Clock, Camera } from 'lucide-react-native';

interface ValidationError {
  field: string;
  message: string;
}

export default function NewOptimizedInspectionScreen() {
  // Form state
  const [formData, setFormData] = useState({
    client_legal_name: '',
    client_trade_name: '',
    client_site_name: '',
    client_site_address: '',
    client_received_by_name: '',
    responsavel_local: '',
    start_travel: '',
    horario_chegada: '',
    service_start_time: '',
    data_execucao: '',
    report_type: '',
    os_number: '',
    legend_instructions: '',
    authorization: false,
    cabin_type: '',
    voltage_level: '',
    installation_type: '',
    grounding_system: '',
    maintenance_area: '',
    maintenance_observations: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  
  const { createInspection } = useInspections();

  // Real-time validation
  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const errors: ValidationError[] = [];

    if (!formData.client_legal_name.trim()) {
      errors.push({ field: 'client_legal_name', message: 'Razão Social do Cliente é obrigatória.' });
    }

    if (!formData.client_site_name.trim()) {
      errors.push({ field: 'client_site_name', message: 'Nome do Local/Obra é obrigatório.' });
    }

    if (!formData.client_site_address.trim()) {
      errors.push({ field: 'client_site_address', message: 'Endereço do Local é obrigatório.' });
    }

    if (!formData.responsavel_local.trim()) {
      errors.push({ field: 'responsavel_local', message: 'Responsável Local é obrigatório.' });
    }

    if (formData.start_travel.trim() && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.start_travel)) {
      errors.push({ field: 'start_travel', message: 'Formato de hora inválido para Início do Deslocamento (use HH:MM).' });
    }

    if (!formData.horario_chegada.trim()) {
      errors.push({ field: 'horario_chegada', message: 'Horário de Chegada é obrigatório.' });
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.horario_chegada)) {
      errors.push({ field: 'horario_chegada', message: 'Formato de hora inválido (use HH:MM).' });
    }

    if (formData.service_start_time.trim() && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.service_start_time)) {
      errors.push({ field: 'service_start_time', message: 'Formato de hora inválido para Início dos Serviços (use HH:MM).' });
    }

    if (!formData.data_execucao.trim()) {
      errors.push({ field: 'data_execucao', message: 'Data de Execução é obrigatória.' });
    }

    if (!formData.report_type) {
      errors.push({ field: 'report_type', message: 'Tipo de Relatório é obrigatório.' });
    }

    if (!formData.authorization) {
      errors.push({ field: 'authorization', message: 'Autorização dos Responsáveis é obrigatória para prosseguir.' });
    }

    if (!formData.cabin_type) {
      errors.push({ field: 'cabin_type', message: 'Tipo de Cabine é obrigatório.' });
    }

    if (!formData.voltage_level) {
      errors.push({ field: 'voltage_level', message: 'Nível de Tensão é obrigatório.' });
    }

    if (!formData.installation_type) {
      errors.push({ field: 'installation_type', message: 'Tipo de Instalação é obrigatório.' });
    }

    if (!formData.grounding_system) {
      errors.push({ field: 'grounding_system', message: 'Sistema de Aterramento é obrigatório.' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const hasFieldError = (fieldName: string): boolean => {
    return validationErrors.some(error => error.field === fieldName);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização negada');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Tentar obter endereço da localização
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const fullAddress = [
            addr.street,
            addr.streetNumber,
            addr.district,
            addr.city,
            addr.region
          ].filter(Boolean).join(', ');
          
          updateFormData('client_site_address', fullAddress);
        }
      } catch (geocodeError) {
        console.log('Erro ao obter endereço:', geocodeError);
      }

      Alert.alert('Sucesso', 'Localização obtida com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter a localização');
    } finally {
      setGettingLocation(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    if (!formData.client_legal_name.trim()) {
      Alert.alert('Erro', 'Razão Social do Cliente é obrigatória para salvar rascunho');
      return;
    }

    setIsDraft(true);
    try {
      const inspectionId = await createInspection({
        clientName: formData.client_legal_name.trim(),
        workSite: formData.client_site_name.trim() || 'Local não especificado',
        address: formData.client_site_address.trim() || undefined,
        gpsLatitude: location?.latitude,
        gpsLongitude: location?.longitude,
      });

      Alert.alert(
        'Rascunho Salvo',
        'Seus dados foram salvos como rascunho. Você pode continuar editando mais tarde.',
        [
          {
            text: 'Continuar Editando',
            onPress: () => router.replace(`/inspection/${inspectionId}`)
          },
          {
            text: 'Voltar à Lista',
            onPress: () => router.replace('/(tabs)/inspections')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o rascunho');
    } finally {
      setIsDraft(false);
    }
  };

  const handleContinueToPhotos = async () => {
    const isValid = validateForm();
    
    if (!isValid) {
      setShowValidationSummary(true);
      return;
    }

    setLoading(true);
    try {
      const inspectionId = await createInspection({
        clientName: formData.client_legal_name.trim(),
        workSite: formData.client_site_name.trim(),
        address: formData.client_site_address.trim() || undefined,
        gpsLatitude: location?.latitude,
        gpsLongitude: location?.longitude,
      });

      // Navegar para a tela de fotos otimizada
      router.replace(`/inspection/${inspectionId}/photos-required`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a inspeção');
    } finally {
      setLoading(false);
    }
  };

  const renderValidationSummary = () => {
    if (!showValidationSummary || validationErrors.length === 0) return null;

    return (
      <View style={styles.validationSummary}>
        <View style={styles.validationHeader}>
          <AlertTriangle size={20} color="#ef4444" />
          <Text style={styles.validationTitle}>
            {validationErrors.length} campo{validationErrors.length > 1 ? 's' : ''} pendente{validationErrors.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => setShowValidationSummary(false)}>
            <Text style={styles.dismissText}>Dispensar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.validationList} showsVerticalScrollIndicator={false}>
          {validationErrors.map((error, index) => (
            <Text key={index} style={styles.validationError}>
              • {error.message}
            </Text>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderProgressIndicator = () => {
    const totalFields = 12; // Campos obrigatórios atualizados
    const completedFields = Object.values(formData).filter(value => 
      typeof value === 'boolean' ? value : value && value.toString().trim()
    ).length;
    const progress = Math.round((completedFields / totalFields) * 100);

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Progresso: {progress}%</Text>
          <Text style={styles.progressFields}>{completedFields}/{totalFields} campos</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Inspeção - Dados Iniciais</Text>
        <TouchableOpacity
          style={styles.draftButton}
          onPress={handleSaveDraft}
          disabled={isDraft}
        >
          <Save size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      {renderProgressIndicator()}

      {/* Validation Summary */}
      {renderValidationSummary()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Preencha os dados básicos</Text>
          <Text style={styles.instructionsText}>
            Estes campos são essenciais para iniciar o processo de inspeção. 
            Você pode salvar como rascunho a qualquer momento.
          </Text>
          
          {/* UI Guidance Steps */}
          <View style={styles.guidanceSteps}>
            <Text style={styles.guidanceTitle}>Orientações de Uso:</Text>
            <Text style={styles.guidanceText}>• Tem que clicar para mudar de tela</Text>
            <Text style={styles.guidanceText}>• Tem que escrever para mudar tela</Text>
            <Text style={styles.guidanceText}>• Tem que tirar foto para mudar de tela</Text>
            <Text style={styles.guidanceText}>• Tem que fazer um vídeo com áudio</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('client_legal_name') && styles.labelError]}>
              Razão Social do Cliente <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Razão social completa conforme CNPJ.</Text>
            <View style={[styles.inputContainer, hasFieldError('client_legal_name') && styles.inputError]}>
              <Building size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: NOVA RIOTEL EMPREENDIMENTOS HOTELEIROS LTDA"
                value={formData.client_legal_name}
                onChangeText={(value) => updateFormData('client_legal_name', value)}
                autoCapitalize="words"
              />
            </View>
            {hasFieldError('client_legal_name') && (
              <Text style={styles.errorText}>{getFieldError('client_legal_name')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Fantasia</Text>
            <Text style={styles.microcopy}>Nome pelo qual a empresa é conhecida comercialmente.</Text>
            <View style={styles.inputContainer}>
              <Building size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Nome comercial da empresa (opcional)"
                value={formData.client_trade_name}
                onChangeText={(value) => updateFormData('client_trade_name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('client_site_name') && styles.labelError]}>
              Nome do Local/Obra <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Nome específico do local onde a inspeção será realizada.</Text>
            <View style={[styles.inputContainer, hasFieldError('client_site_name') && styles.inputError]}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: FAIRMONT RJ COPACABANA"
                value={formData.client_site_name}
                onChangeText={(value) => updateFormData('client_site_name', value)}
                autoCapitalize="words"
              />
            </View>
            {hasFieldError('client_site_name') && (
              <Text style={styles.errorText}>{getFieldError('client_site_name')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('client_site_address') && styles.labelError]}>
              Endereço do Local <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Endereço físico completo onde a inspeção será realizada.</Text>
            <View style={[styles.inputContainer, hasFieldError('client_site_address') && styles.inputError]}>
              <MapPin size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: Av. Atlântica, 4240 Copacabana - Rio de Janeiro RJ"
                value={formData.client_site_address}
                onChangeText={(value) => updateFormData('client_site_address', value)}
                multiline
                numberOfLines={2}
                autoCapitalize="words"
              />
            </View>
            {hasFieldError('client_site_address') && (
              <Text style={styles.errorText}>{getFieldError('client_site_address')}</Text>
            )}
            
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              <Navigation size={16} color="#2563eb" />
              <Text style={styles.locationButtonText}>
                {gettingLocation ? 'Obtendo localização...' : 'Usar localização atual'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Funcionário que Recebeu a Equipe</Text>
            <Text style={styles.microcopy}>Nome do funcionário do cliente que recebeu nossa equipe no local.</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: RICARDO"
                value={formData.client_received_by_name}
                onChangeText={(value) => updateFormData('client_received_by_name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('responsavel_local') && styles.labelError]}>
              Responsável Local <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Pessoa de contato no local da obra.</Text>
            <View style={[styles.inputContainer, hasFieldError('responsavel_local') && styles.inputError]}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Nome do responsável no local da inspeção"
                value={formData.responsavel_local}
                onChangeText={(value) => updateFormData('responsavel_local', value)}
                autoCapitalize="words"
              />
            </View>
            {hasFieldError('responsavel_local') && (
              <Text style={styles.errorText}>{getFieldError('responsavel_local')}</Text>
            )}
          </View>
        </View>

        {/* Schedule Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Agendamento</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('start_travel') && styles.labelError]}>
              Início do Deslocamento
            </Text>
            <Text style={styles.microcopy}>Horário de saída para o local da inspeção (formato 24h).</Text>
            <View style={[styles.inputContainer, hasFieldError('start_travel') && styles.inputError]}>
              <Clock size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.start_travel}
                onChangeText={(value) => updateFormData('start_travel', value)}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            {hasFieldError('start_travel') && (
              <Text style={styles.errorText}>{getFieldError('start_travel')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('horario_chegada') && styles.labelError]}>
              Horário de Chegada <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Horário de chegada ao local da inspeção (formato 24h).</Text>
            <View style={[styles.inputContainer, hasFieldError('horario_chegada') && styles.inputError]}>
              <Clock size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.horario_chegada}
                onChangeText={(value) => updateFormData('horario_chegada', value)}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            {hasFieldError('horario_chegada') && (
              <Text style={styles.errorText}>{getFieldError('horario_chegada')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('service_start_time') && styles.labelError]}>
              Início dos Serviços
            </Text>
            <Text style={styles.microcopy}>Horário de início efetivo dos trabalhos de inspeção (formato 24h).</Text>
            <View style={[styles.inputContainer, hasFieldError('service_start_time') && styles.inputError]}>
              <Clock size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.service_start_time}
                onChangeText={(value) => updateFormData('service_start_time', value)}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            {hasFieldError('service_start_time') && (
              <Text style={styles.errorText}>{getFieldError('service_start_time')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('data_execucao') && styles.labelError]}>
              Data de Execução <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Data em que a inspeção está sendo realizada.</Text>
            <View style={[styles.inputContainer, hasFieldError('data_execucao') && styles.inputError]}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={formData.data_execucao}
                onChangeText={(value) => updateFormData('data_execucao', value)}
                keyboardType="numeric"
              />
            </View>
            {hasFieldError('data_execucao') && (
              <Text style={styles.errorText}>{getFieldError('data_execucao')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('report_type') && styles.labelError]}>
              Tipo de Relatório <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Tipo principal do relatório conforme capa do documento.</Text>
            <View style={styles.selectContainer}>
              {['MANUTENÇÃO PREVENTIVA', 'MANUTENÇÃO CORRETIVA', 'OUTRO'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.report_type === option && styles.selectOptionActive,
                    hasFieldError('report_type') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('report_type', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.report_type === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('report_type') && (
              <Text style={styles.errorText}>{getFieldError('report_type')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número da OS</Text>
            <Text style={styles.microcopy}>Identificador da Ordem de Serviço, se aplicável.</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Número da Ordem de Serviço (opcional)"
                value={formData.os_number}
                onChangeText={(value) => updateFormData('os_number', value)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instruções da Legenda</Text>
            <Text style={styles.microcopy}>Texto da legenda do modelo para referência (opcional).</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Texto da legenda presente no modelo (opcional)"
                value={formData.legend_instructions}
                onChangeText={(value) => updateFormData('legend_instructions', value)}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        </View>

        {/* Technical Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Especificações Técnicas</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('cabin_type') && styles.labelError]}>
              Tipo de Cabine <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Selecione o tipo de cabine elétrica a ser inspecionada.</Text>
            <View style={styles.selectContainer}>
              {['CONVENCIONAL', 'SIMPLIFICADA', 'ESTALEIRO', 'OUTRO'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.cabin_type === option && styles.selectOptionActive,
                    hasFieldError('cabin_type') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('cabin_type', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.cabin_type === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('cabin_type') && (
              <Text style={styles.errorText}>{getFieldError('cabin_type')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('voltage_level') && styles.labelError]}>
              Nível de Tensão <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Tensão de operação da instalação.</Text>
            <View style={styles.selectContainer}>
              {['13.8 kV', '23 kV', '34.5 kV', 'Outro'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.voltage_level === option && styles.selectOptionActive,
                    hasFieldError('voltage_level') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('voltage_level', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.voltage_level === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('voltage_level') && (
              <Text style={styles.errorText}>{getFieldError('voltage_level')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('installation_type') && styles.labelError]}>
              Tipo de Instalação <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Classificação da instalação elétrica.</Text>
            <View style={styles.selectContainer}>
              {['Aérea', 'Subterrânea', 'Mista', 'Outro'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.installation_type === option && styles.selectOptionActive,
                    hasFieldError('installation_type') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('installation_type', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.installation_type === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('installation_type') && (
              <Text style={styles.errorText}>{getFieldError('installation_type')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, hasFieldError('grounding_system') && styles.labelError]}>
              Sistema de Aterramento <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.microcopy}>Tipo de sistema de aterramento utilizado.</Text>
            <View style={styles.selectContainer}>
              {['TN-S', 'TN-C', 'TT', 'IT', 'Outro'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    formData.grounding_system === option && styles.selectOptionActive,
                    hasFieldError('grounding_system') && styles.selectOptionError,
                  ]}
                  onPress={() => updateFormData('grounding_system', option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    formData.grounding_system === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasFieldError('grounding_system') && (
              <Text style={styles.errorText}>{getFieldError('grounding_system')}</Text>
            )}
          </View>
        </View>

        {/* Maintenance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Manutenção</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Área de Manutenção</Text>
            <Text style={styles.microcopy}>Área específica ou escopo da manutenção.</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: MANUTENÇÃO CABINE PRIMÁRIA"
                value={formData.maintenance_area}
                onChangeText={(value) => updateFormData('maintenance_area', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações da Manutenção</Text>
            <Text style={styles.microcopy}>Observações específicas sobre o escopo da manutenção.</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Observações específicas sobre o escopo da manutenção"
                value={formData.maintenance_observations}
                onChangeText={(value) => updateFormData('maintenance_observations', value)}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Authorization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Autorização</Text>
          
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[
                styles.authorizationContainer,
                hasFieldError('authorization') && styles.authorizationError,
                formData.authorization && styles.authorizationActive,
              ]}
              onPress={() => updateFormData('authorization', !formData.authorization)}
            >
              <View style={styles.authorizationLeft}>
                <View style={[
                  styles.checkbox,
                  formData.authorization && styles.checkboxActive,
                ]}>
                  {formData.authorization && <CheckCircle size={20} color="#ffffff" />}
                </View>
                <View style={styles.authorizationText}>
                  <Text style={[
                    styles.authorizationLabel,
                    hasFieldError('authorization') && styles.labelError,
                  ]}>
                    Autorização dos Responsáveis <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.microcopy}>
                    Confirme que a autorização para a inspeção foi obtida.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            {hasFieldError('authorization') && (
              <Text style={styles.errorText}>{getFieldError('authorization')}</Text>
            )}
          </View>
        </View>

        {location && (
          <View style={styles.locationInfo}>
            <MapPin size={16} color="#10b981" />
            <Text style={styles.locationText}>
              📍 Coordenadas: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.draftButtonLarge}
          onPress={handleSaveDraft}
          disabled={isDraft || !formData.client_legal_name.trim()}
        >
          <Save size={20} color="#6b7280" />
          <Text style={styles.draftButtonText}>
            {isDraft ? 'Salvando...' : 'Salvar Rascunho'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.continueButton, (loading || validationErrors.length > 0) && styles.continueButtonDisabled]}
          onPress={handleContinueToPhotos}
          disabled={loading || validationErrors.length > 0}
        >
          <Camera size={20} color="#ffffff" />
          <Text style={styles.continueButtonText}>
            {loading ? 'Criando...' : 'Continuar para Fotos'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  draftButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressFields: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  validationSummary: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    margin: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fef2f2',
  },
  validationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    flex: 1,
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  validationList: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  validationError: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  guidanceSteps: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  guidanceText: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 2,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  labelError: {
    color: '#ef4444',
  },
  required: {
    color: '#ef4444',
  },
  microcopy: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 12,
    color: '#1f2937',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '500',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  selectOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  selectOptionError: {
    borderColor: '#ef4444',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: '#ffffff',
  },
  authorizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  authorizationError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  authorizationActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  authorizationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  authorizationText: {
    flex: 1,
  },
  authorizationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#166534',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  draftButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 8,
  },
  draftButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});