import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Eye, EyeOff, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  // Validações em tempo real
  const [validations, setValidations] = useState({
    passwordLength: false,
    passwordUppercase: false,
    passwordNumber: false,
    passwordMatch: false,
  });

  useEffect(() => {
    if (!token) {
      Alert.alert(
        'Link Inválido',
        'O link de recuperação é inválido ou expirou.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login')
          }
        ]
      );
    }
  }, [token]);

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const passwordValidation = validatePassword(text);
    setValidations(prev => ({
      ...prev,
      passwordLength: passwordValidation.length,
      passwordUppercase: passwordValidation.uppercase,
      passwordNumber: passwordValidation.number,
      passwordMatch: text === confirmPassword && text.length > 0
    }));
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setValidations(prev => ({
      ...prev,
      passwordMatch: text === password && text.length > 0
    }));
  };

  const isFormValid = () => {
    return Object.values(validations).every(Boolean);
  };

  const handleResetPassword = async () => {
    if (!isFormValid()) {
      Alert.alert('Erro', 'Por favor, corrija os erros antes de continuar');
      return;
    }

    if (!token) {
      Alert.alert('Erro', 'Token de recuperação inválido');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token as string, password);
      Alert.alert(
        'Senha Redefinida!',
        'Sua senha foi alterada com sucesso. Faça login com sua nova senha.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível redefinir a senha');
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <View style={styles.validationItem}>
      {isValid ? (
        <CheckCircle size={16} color="#10b981" />
      ) : (
        <XCircle size={16} color="#ef4444" />
      )}
      <Text style={[styles.validationText, { color: isValid ? '#10b981' : '#ef4444' }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Lock size={48} color="#2563eb" />
          </View>
          <Text style={styles.title}>Redefinir Senha</Text>
          <Text style={styles.subtitle}>
            Digite sua nova senha abaixo
          </Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          {/* Nova Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nova Senha</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Digite sua nova senha"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmar Nova Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Nova Senha</Text>
            <View style={[styles.inputContainer, !validations.passwordMatch && confirmPassword.length > 0 && styles.inputError]}>
              <Lock size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Validações da Senha */}
          {password.length > 0 && (
            <View style={styles.validationContainer}>
              <Text style={styles.validationTitle}>Requisitos da senha:</Text>
              <ValidationItem isValid={validations.passwordLength} text="Mínimo 8 caracteres" />
              <ValidationItem isValid={validations.passwordUppercase} text="Pelo menos 1 letra maiúscula" />
              <ValidationItem isValid={validations.passwordNumber} text="Pelo menos 1 número" />
              {confirmPassword.length > 0 && (
                <ValidationItem isValid={validations.passwordMatch} text="Senhas coincidem" />
              )}
            </View>
          )}

          {/* Botão de Redefinir */}
          <TouchableOpacity
            style={[styles.resetButton, (!isFormValid() || loading) && styles.resetButtonDisabled]}
            onPress={handleResetPassword}
            disabled={!isFormValid() || loading}
          >
            <Text style={styles.resetButtonText}>
              {loading ? 'Redefinindo...' : 'REDEFINIR SENHA'}
            </Text>
          </TouchableOpacity>

          {/* Link para Login */}
          <TouchableOpacity
            style={styles.backToLoginLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.backToLoginText}>
              Voltar ao login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#dbeafe',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#1f2937',
  },
  validationContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  validationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  validationText: {
    fontSize: 14,
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  backToLoginText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
});