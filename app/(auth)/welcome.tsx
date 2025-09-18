import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Building2, Shield, CircleCheck as CheckCircle, Zap, Camera, FileText } from 'lucide-react-native';

export default function WelcomeScreen() {
  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Zap size={64} color="#2563EB" />
          </View>
          <Text style={styles.appTitle}>Inspeção Elétrica</Text>
          <Text style={styles.appSubtitle}>Sistema de Inspeção de Infraestrutura</Text>
          <Text style={styles.appDescription}>
            Sistema completo para inspeção de cabines de média e baixa tensão
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <CheckCircle size={24} color="#059669" />
            <Text style={styles.featureText}>Checklists Digitais Completos</Text>
          </View>
          <View style={styles.feature}>
            <Camera size={24} color="#059669" />
            <Text style={styles.featureText}>Captura de Evidências Fotográficas</Text>
          </View>
          <View style={styles.feature}>
            <FileText size={24} color="#059669" />
            <Text style={styles.featureText}>Relatórios Técnicos Profissionais</Text>
          </View>
          <View style={styles.feature}>
            <Shield size={24} color="#059669" />
            <Text style={styles.featureText}>Conformidade com Normas Técnicas</Text>
          </View>
          <View style={styles.feature}>
            <Building2 size={24} color="#059669" />
            <Text style={styles.featureText}>Gestão de Cabines MT/BT</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>
            Otimize suas inspeções de manutenção preventiva em cabines de média e baixa tensão.
            Documente, organize e gere relatórios profissionais com evidências fotográficas.
          </Text>
          
          <View style={styles.demoCredentials}>
            <Text style={styles.demoTitle}>Credenciais de Demonstração:</Text>
            <Text style={styles.demoText}>E-mail: inspetor@empresa.com</Text>
            <Text style={styles.demoText}>Senha: 123456</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Criar Conta</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Aplicativo para profissionais de elétrica especialistas em MT/BT
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  descriptionSection: {
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  demoCredentials: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: '#3730A3',
    fontFamily: 'monospace',
  },
  actionSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 24,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});