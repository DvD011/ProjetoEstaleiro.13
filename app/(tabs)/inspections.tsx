import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useInspections } from '@/hooks/useInspections';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  MapPin, 
  Calendar, 
  CircleCheck as CheckCircle, 
  Clock, 
  TriangleAlert as AlertTriangle,
  TrendingUp,
  Download,
  Share
} from 'lucide-react-native';

type FilterType = 'all' | 'draft' | 'in_progress' | 'completed' | 'synced';
type SortType = 'date_desc' | 'date_asc' | 'progress_desc' | 'client_asc';

export default function InspectionsScreen() {
  const { inspections, loading, refreshInspections, getInspectionStats } = useInspections();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date_desc');
  const [showFilters, setShowFilters] = useState(false);
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

  const filteredAndSortedInspections = inspections
    .filter(inspection => {
      // Filter by status
      if (activeFilter !== 'all' && inspection.status !== activeFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inspection.clientName.toLowerCase().includes(query) ||
          inspection.workSite.toLowerCase().includes(query) ||
          (inspection.address && inspection.address.toLowerCase().includes(query)) ||
          inspection.id.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'progress_desc':
          return (b.progress || 0) - (a.progress || 0);
        case 'client_asc':
          return a.clientName.localeCompare(b.clientName);
        default: // date_desc
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'synced': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluída';
      case 'synced': return 'Sincronizada';
      default: return 'Desconhecido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText size={16} color="#f59e0b" />;
      case 'in_progress': return <Clock size={16} color="#3b82f6" />;
      case 'completed': return <CheckCircle size={16} color="#10b981" />;
      case 'synced': return <TrendingUp size={16} color="#6366f1" />;
      default: return <AlertTriangle size={16} color="#6b7280" />;
    }
  };

  const filters = [
    { key: 'all', label: 'Todas', count: stats.total },
    { key: 'draft', label: 'Rascunhos', count: stats.pending },
    { key: 'in_progress', label: 'Em Andamento', count: stats.inProgress },
    { key: 'completed', label: 'Concluídas', count: stats.completed },
  ];

  const handleInspectionPress = (inspection: any) => {
    router.push(`/inspection/${inspection.id}`);
  };

  const handleNewInspection = () => {
    router.push('/inspection/new');
  };

  const handleExportInspection = (inspection: any) => {
    Alert.alert(
      'Exportar Inspeção',
      `Exportar dados da inspeção "${inspection.clientName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Exportar', onPress: () => {
          Alert.alert('Sucesso', 'Dados exportados com sucesso!');
        }},
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Inspeções</Text>
          <TouchableOpacity
            style={styles.newButton}
            onPress={handleNewInspection}
          >
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, local ou ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersRow}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      activeFilter === filter.key && styles.filterChipActive
                    ]}
                    onPress={() => setActiveFilter(filter.key as FilterType)}
                  >
                    <Text style={[
                      styles.filterText,
                      activeFilter === filter.key && styles.filterTextActive
                    ]}>
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Clock size={20} color="#f59e0b" />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <FileText size={20} color="#3b82f6" />
            <Text style={styles.statNumber}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>Em Andamento</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
        </View>
      </View>

      {/* Inspections List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAndSortedInspections.length > 0 ? (
          filteredAndSortedInspections.map((inspection) => (
            <TouchableOpacity
              key={inspection.id}
              style={styles.inspectionCard}
              onPress={() => handleInspectionPress(inspection)}
            >
              <View style={styles.inspectionHeader}>
                <View style={styles.inspectionInfo}>
                  <Text style={styles.inspectionClient}>{inspection.clientName}</Text>
                  <Text style={styles.inspectionSite}>{inspection.workSite}</Text>
                </View>
                <View style={styles.inspectionActions}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(inspection.status) }
                  ]}>
                    {getStatusIcon(inspection.status)}
                    <Text style={styles.statusText}>
                      {getStatusText(inspection.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.inspectionDetails}>
                {inspection.address && (
                  <View style={styles.detailRow}>
                    <MapPin size={14} color="#6b7280" />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {inspection.address}
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Calendar size={14} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {new Date(inspection.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <FileText size={14} color="#6b7280" />
                  <Text style={styles.detailText}>ID: {inspection.id.slice(-8)}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>
                    Progresso: {inspection.progress || 0}%
                  </Text>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => handleExportInspection(inspection)}
                  >
                    <Share size={14} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${inspection.progress || 0}%`,
                        backgroundColor: getStatusColor(inspection.status)
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* GPS Status */}
              {inspection.gpsLatitude && inspection.gpsLongitude && (
                <View style={styles.gpsContainer}>
                  <MapPin size={12} color="#10b981" />
                  <Text style={styles.gpsText}>
                    GPS: {inspection.gpsLatitude.toFixed(4)}, {inspection.gpsLongitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'Nenhuma inspeção encontrada' : 'Nenhuma inspeção ainda'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Tente ajustar os filtros ou termo de busca'
                : 'Crie sua primeira inspeção para começar'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleNewInspection}
              >
                <Plus size={20} color="#ffffff" />
                <Text style={styles.createFirstButtonText}>Criar Primeira Inspeção</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  newButton: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  filterButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingTop: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  inspectionSite: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  inspectionActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  inspectionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  exportButton: {
    padding: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  gpsText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});