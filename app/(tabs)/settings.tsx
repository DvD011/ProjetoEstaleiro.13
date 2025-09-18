import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { WebhookStatus } from '@/components/checklist/WebhookStatus';
import { Settings as SettingsIcon, Wifi, Database, Download, Upload, Trash2, LogOut, Bell, Moon, Shield, CircleHelp as HelpCircle } from 'lucide-react-native';

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [autoSync, setAutoSync] = React.useState(true);
  const [showWebhooks, setShowWebhooks] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Limpar Dados',
      'Esta ação irá remover todas as inspeções não sincronizadas. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: () => {
          // Implementar limpeza de dados
          Alert.alert('Sucesso', 'Dados locais removidos com sucesso');
        }},
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightComponent,
    danger = false 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'email@empresa.com'}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'inspector' ? 'Inspetor' : 
               user?.role === 'supervisor' ? 'Supervisor' : 'Administrador'}
            </Text>
          </View>
        </View>
      </View>

      {/* Sync Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sincronização</Text>
        
        <SettingItem
          icon={<Wifi size={24} color="#2563eb" />}
          title="Sincronização Automática"
          subtitle="Sincronizar dados quando conectado"
          rightComponent={
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
              thumbColor={autoSync ? '#2563eb' : '#9ca3af'}
            />
          }
        />

        <SettingItem
          icon={<Upload size={24} color="#059669" />}
          title="Sincronizar Agora"
          subtitle="Enviar dados pendentes para o servidor"
          onPress={() => {
            Alert.alert('Sincronização', 'Sincronização iniciada...');
          }}
        />

        <SettingItem
          icon={<Download size={24} color="#7c3aed" />}
          title="Baixar Dados"
          subtitle="Atualizar dados do servidor"
          onPress={() => {
            Alert.alert('Download', 'Download de dados iniciado...');
          }}
        />

        <SettingItem
          icon={<Wifi size={24} color="#059669" />}
          title="Status dos Webhooks"
          subtitle="Verificar integrações externas"
          onPress={() => setShowWebhooks(true)}
        />
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicativo</Text>
        
        <SettingItem
          icon={<Bell size={24} color="#f59e0b" />}
          title="Notificações"
          subtitle="Receber alertas e lembretes"
          rightComponent={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#e5e7eb', true: '#fef3c7' }}
              thumbColor={notifications ? '#f59e0b' : '#9ca3af'}
            />
          }
        />

        <SettingItem
          icon={<Moon size={24} color="#6366f1" />}
          title="Modo Escuro"
          subtitle="Tema escuro para ambientes com pouca luz"
          rightComponent={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#e5e7eb', true: '#e0e7ff' }}
              thumbColor={darkMode ? '#6366f1' : '#9ca3af'}
            />
          }
        />
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados</Text>
        
        <SettingItem
          icon={<Database size={24} color="#6b7280" />}
          title="Armazenamento Local"
          subtitle="Gerenciar dados salvos no dispositivo"
          onPress={() => {
            Alert.alert('Armazenamento', 'Dados locais: 45.2 MB\nFotos: 128.7 MB\nTotal: 173.9 MB');
          }}
        />

        <SettingItem
          icon={<Trash2 size={24} color="#ef4444" />}
          title="Limpar Dados Locais"
          subtitle="Remove inspeções não sincronizadas"
          onPress={handleClearData}
          danger
        />
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suporte</Text>
        
        <SettingItem
          icon={<HelpCircle size={24} color="#059669" />}
          title="Ajuda"
          subtitle="Guias e tutoriais"
          onPress={() => {
            Alert.alert('Ajuda', 'Abrindo central de ajuda...');
          }}
        />

        <SettingItem
          icon={<Shield size={24} color="#7c3aed" />}
          title="Política de Privacidade"
          subtitle="Como seus dados são protegidos"
          onPress={() => {
            Alert.alert('Privacidade', 'Abrindo política de privacidade...');
          }}
        />
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <SettingItem
          icon={<LogOut size={24} color="#ef4444" />}
          title="Sair"
          subtitle="Desconectar da conta atual"
          onPress={handleLogout}
          danger
        />
      </View>

      {/* Version Info */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>Versão 1.0.0</Text>
        <Text style={styles.versionText}>Build 2024.01.15</Text>
      </View>

      {/* Webhook Status Modal */}
      {showWebhooks && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <WebhookStatus
              visible={showWebhooks}
              onClose={() => setShowWebhooks(false)}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowWebhooks(false)}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerDanger: {
    backgroundColor: '#fef2f2',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingTitleDanger: {
    color: '#ef4444',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  closeModalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});