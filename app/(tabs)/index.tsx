import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useInspections } from '@/hooks/useInspections';
import { Plus, FileText, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, MapPin, Calendar, TrendingUp } from 'lucide-react-native';
import { Camera } from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const { inspections, getInspectionStats, refreshInspections } = useInspections();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0
  });

  useEffect(() => {
    loadStats();
  }, [inspections]);

  const loadStats = async () => {
    const inspectionStats = await getInspectionStats();
    setStats(inspectionStats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshInspections();
    setRefreshing(false);
  };

  const recentInspections = inspections
    .filter(inspection => inspection.status !== 'completed')
    .slice(0, 3);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name || 'Inspetor'}</Text>
          <Text style={styles.subtitle}>Bem-vindo ao sistema de inspeções</Text>
        </View>
        <TouchableOpacity
          style={styles.newInspectionButton}
          onPress={() => router.push('/inspection/new')}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Clock size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <FileText size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>Em Andamento</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
        </View>
      </View>

      {/* Recent Inspections */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inspeções Recentes</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/inspections')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {recentInspections.length > 0 ? (
          recentInspections.map((inspection) => (
            <TouchableOpacity
              key={inspection.id}
              style={styles.inspectionCard}
              onPress={() => router.push(`/inspection/${inspection.id}`)}
            >
              <View style={styles.inspectionHeader}>
                <View style={styles.inspectionInfo}>
                  <Text style={styles.inspectionClient}>{inspection.clientName}</Text>
                  <Text style={styles.inspectionSite}>{inspection.workSite}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(inspection.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {getStatusText(inspection.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.inspectionDetails}>
                <View style={styles.detailItem}>
                  <MapPin size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{inspection.address}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Calendar size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {new Date(inspection.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>

              {inspection.status === 'in_progress' && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    Progresso: {inspection.progress || 0}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${inspection.progress || 0}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>Nenhuma inspeção recente</Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => router.push('/inspection/new')}
            >
              <Text style={styles.createFirstButtonText}>Criar primeira inspeção</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/inspection/new')}
          >
            <Plus size={32} color="#2563eb" />
            <Text style={styles.quickActionText}>Nova Inspeção</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/inspection/new-optimized')}
          >
            <Plus size={32} color="#059669" />
            <Text style={styles.quickActionText}>Nova (Otimizada)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/inspections')}
          >
            <TrendingUp size={32} color="#059669" />
            <Text style={styles.quickActionText}>Relatórios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/camera/demo')}
          >
            <Camera size={32} color="#7c3aed" />
            <Text style={styles.quickActionText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return '#f59e0b';
    case 'in_progress': return '#3b82f6';
    case 'completed': return '#10b981';
    case 'synced': return '#6366f1';
    default: return '#6b7280';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'draft': return 'Rascunho';
    case 'in_progress': return 'Em Andamento';
    case 'completed': return 'Concluída';
    case 'synced': return 'Sincronizada';
    default: return 'Desconhecido';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  newInspectionButton: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  inspectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inspectionInfo: {
    flex: 1,
  },
  inspectionClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  inspectionSite: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  inspectionDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 20,
  },
  createFirstButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    marginTop: 8,
  },
});