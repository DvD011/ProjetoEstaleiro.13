import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Shield, Calendar, MapPin, Phone, CreditCard as Edit, Award, TrendingUp, FileText, Clock } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user } = useAuth();

  const handleEditProfile = () => {
    Alert.alert('Editar Perfil', 'Funcionalidade em desenvolvimento');
  };

  const StatCard = ({ icon, title, value, color }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const InfoRow = ({ icon, label, value }: {
    icon: React.ReactNode;
    label: string;
    value: string;
  }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        {icon}
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Usuário'}</Text>
            <Text style={styles.role}>
              {user?.role === 'inspector' ? 'Inspetor Elétrico' : 
               user?.role === 'supervisor' ? 'Supervisor' : 'Administrador'}
            </Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Ativo</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Edit size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<FileText size={24} color="#2563eb" />}
            title="Inspeções"
            value="47"
            color="#2563eb"
          />
          <StatCard
            icon={<Clock size={24} color="#f59e0b" />}
            title="Este Mês"
            value="12"
            color="#f59e0b"
          />
          <StatCard
            icon={<TrendingUp size={24} color="#10b981" />}
            title="Taxa Sucesso"
            value="98%"
            color="#10b981"
          />
          <StatCard
            icon={<Award size={24} color="#8b5cf6" />}
            title="Certificações"
            value="3"
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        <View style={styles.infoContainer}>
          <InfoRow
            icon={<Mail size={20} color="#6b7280" />}
            label="Email"
            value={user?.email || 'email@empresa.com'}
          />
          <InfoRow
            icon={<Phone size={20} color="#6b7280" />}
            label="Telefone"
            value="+55 (11) 99999-9999"
          />
          <InfoRow
            icon={<MapPin size={20} color="#6b7280" />}
            label="Localização"
            value="São Paulo, SP"
          />
          <InfoRow
            icon={<Calendar size={20} color="#6b7280" />}
            label="Membro desde"
            value="Janeiro 2023"
          />
        </View>
      </View>

      {/* Professional Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Profissionais</Text>
        <View style={styles.infoContainer}>
          <InfoRow
            icon={<Shield size={20} color="#6b7280" />}
            label="Registro Profissional"
            value="CREA-SP 123456789"
          />
          <InfoRow
            icon={<Award size={20} color="#6b7280" />}
            label="Especialização"
            value="Sistemas Elétricos de Potência"
          />
          <InfoRow
            icon={<Calendar size={20} color="#6b7280" />}
            label="Experiência"
            value="8 anos"
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atividade Recente</Text>
        <View style={styles.activityContainer}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <FileText size={16} color="#2563eb" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Inspeção concluída</Text>
              <Text style={styles.activityDescription}>Cliente ABC - Subestação Norte</Text>
              <Text style={styles.activityTime}>Há 2 horas</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <TrendingUp size={16} color="#10b981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Relatório enviado</Text>
              <Text style={styles.activityDescription}>Relatório INS-2024-001 sincronizado</Text>
              <Text style={styles.activityTime}>Há 4 horas</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Award size={16} color="#8b5cf6" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Certificação renovada</Text>
              <Text style={styles.activityDescription}>NR-10 - Segurança em Instalações Elétricas</Text>
              <Text style={styles.activityTime}>Há 2 dias</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  role: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingVertical: 20,
  },
  infoContainer: {
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    marginTop: 2,
  },
  activityContainer: {
    paddingHorizontal: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  activityDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});