import React, { useState } from 'react';
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
import { 
  ArrowLeft,
  MapPin,
  Building,
  FileText,
  Save,
  Navigation
} from 'lucide-react-native';

export default function NewInspectionScreen() {
  const [clientName, setClientName] = useState('');
  const [workSite, setWorkSite] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  const { createInspection } = useInspections();

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
          
          setAddress(fullAddress);
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

  const handleCreateInspection = async () => {
    if (!clientName.trim() || !workSite.trim()) {
      Alert.alert('Erro', 'Por favor, preencha pelo menos o nome do cliente e local da obra');
      return;
    }

    setLoading(true);
    try {
      const inspectionId = await createInspection({
        clientName: clientName.trim(),
        workSite: workSite.trim(),
        address: address.trim() || undefined,
        gpsLatitude: location?.latitude,
        gpsLongitude: location?.longitude,
      });

      Alert.alert(
        'Sucesso',
        'Inspeção criada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/inspection/${inspectionId}`)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a inspeção');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.title}>Nova Inspeção</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nome do Cliente <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Building size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: Empresa ABC Ltda"
                value={clientName}
                onChangeText={setClientName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Local da Obra <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Ex: Subestação Norte, Fábrica Principal"
                value={workSite}
                onChangeText={setWorkSite}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Endereço completo da obra"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
                autoCapitalize="words"
              />
            </View>
            
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

          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                📍 Coordenadas: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        {/* Instruções */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos Passos</Text>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              Após criar a inspeção, você será direcionado para os módulos de coleta de dados:
            </Text>
            
            <View style={styles.modulesList}>
              <Text style={styles.moduleItem}>1. Cliente/Obra - Dados básicos e localização</Text>
              <Text style={styles.moduleItem}>2. Tipo de Cabine - Especificações técnicas</Text>
              <Text style={styles.moduleItem}>3. Procedimentos - Segurança e operação</Text>
              <Text style={styles.moduleItem}>4. Manutenção - Histórico e planejamento</Text>
              <Text style={styles.moduleItem}>5. Transformadores - Ensaios e medições</Text>
              <Text style={styles.moduleItem}>6. Conexão Concessionária - Interface de rede</Text>
              <Text style={styles.moduleItem}>7. Média Tensão (MT) - Sistema MT</Text>
              <Text style={styles.moduleItem}>8. Baixa Tensão (BT) - Sistema BT</Text>
              <Text style={styles.moduleItem}>9. EPCs - Proteção coletiva</Text>
              <Text style={styles.moduleItem}>10. Estado Geral - Avaliação final</Text>
              <Text style={styles.moduleItem}>11. Religamento - Procedimentos finais</Text>
              <Text style={styles.moduleItem}>12. Irregularidades - Componentes com problemas (opcional)</Text>
              
              <Text style={styles.moduleNote}>
                💡 Dica: O sistema gerará automaticamente um ID único para cada inspeção. Você pode opcionalmente inserir um número de OS manual no módulo Cliente/Obra.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateInspection}
          disabled={loading || !clientName.trim() || !workSite.trim()}
        >
          <Save size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>
            {loading ? 'Criando...' : 'Criar Inspeção'}
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
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
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 12,
    color: '#1f2937',
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
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#166534',
  },
  instructionsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  modulesList: {
    gap: 4,
  },
  moduleItem: {
    fontSize: 13,
    color: '#374151',
    paddingVertical: 2,
  },
  moduleNote: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    fontStyle: 'italic',
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
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});