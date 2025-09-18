import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePreventiveChecklist } from '@/hooks/usePreventiveChecklist';
import { ChecklistItemCard } from '@/components/checklist/ChecklistItemCard';
import { CorrectiveActionForm } from '@/components/checklist/CorrectiveActionForm';
import { CorrectiveAction } from '@/types/checklist';
import { ArrowLeft, ClipboardCheck, TrendingUp, TriangleAlert as AlertTriangle, FileText, Filter, Eye, Ruler, Settings, Shield } from 'lucide-react-native';

type FilterType = 'all' | 'visual' | 'medicao' | 'operacional' | 'seguranca';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

export default function ChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCorrectiveForm, setShowCorrectiveForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const {
    checklistItems,
    executions,
    correctiveActions,
    loading,
    cabinType,
    executeChecklistItem,
    updateCorrectiveAction,
    createAutomaticCorrectiveAction,
    getChecklistProgress,
    getItemsRequiringCorrection,
  } = usePreventiveChecklist(id!);

  const progress = getChecklistProgress();
  const itemsRequiringCorrection = getItemsRequiringCorrection();

  const filteredItems = checklistItems.filter(item => {
    const categoryMatch = activeFilter === 'all' || item.categoria === activeFilter;
    
    const execution = executions.find(e => e.checklist_item_id === item.id);
    const statusMatch = statusFilter === 'all' || 
                       (statusFilter === 'pending' && !execution) ||
                       (statusFilter === 'completed' && execution?.status === 'completed') ||
                       (statusFilter === 'failed' && execution?.status === 'failed');
    
    return categoryMatch && statusMatch;
  });

  const handleCreateCorrectiveAction = async (itemId: string, description: string) => {
    const item = checklistItems.find(i => i.id === itemId);
    if (!item) return;

    try {
      const faultId = await createAutomaticCorrectiveAction(itemId, description, item.criticidade);
      if (faultId) {
        Alert.alert(
          'Ação Corretiva Criada',
          `Ação corretiva criada com ID: ${faultId}${item.criticidade === 'alta' ? '\n\nOS será gerada automaticamente.' : ''}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a ação corretiva');
    }
  };

  const handleSaveCorrectiveAction = async (action: CorrectiveAction): Promise<boolean> => {
    try {
      const success = await updateCorrectiveAction(action.fault_id, action);
      if (success) {
        setShowCorrectiveForm(false);
        setSelectedItemId('');
      }
      return success;
    } catch (error) {
      return false;
    }
  };

  const filters = [
    { key: 'all', label: 'Todos', icon: ClipboardCheck },
    { key: 'visual', label: 'Visual', icon: Eye },
    { key: 'medicao', label: 'Medição', icon: Ruler },
    { key: 'operacional', label: 'Operacional', icon: Settings },
    { key: 'seguranca', label: 'Segurança', icon: Shield },
  ];

  const statusFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'completed', label: 'Concluídos' },
    { key: 'failed', label: 'Falharam' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando checklist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Checklist Preventivo</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Summary */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            Progresso - {cabinType}
          </Text>
          <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
        </View>
        
        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatNumber}>{progress.completed}</Text>
            <Text style={styles.progressStatLabel}>Concluídos</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={[styles.progressStatNumber, { color: '#ef4444' }]}>{progress.failed}</Text>
            <Text style={styles.progressStatLabel}>Falharam</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={[styles.progressStatNumber, { color: '#f59e0b' }]}>{progress.pending}</Text>
            <Text style={styles.progressStatLabel}>Pendentes</Text>
          </View>
        </View>

        {itemsRequiringCorrection.length > 0 && (
          <View style={styles.alertSection}>
            <AlertTriangle size={16} color="#ef4444" />
            <Text style={styles.alertText}>
              {itemsRequiringCorrection.length} item(s) requer(em) ação corretiva
            </Text>
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersRow}>
            {filters.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    activeFilter === filter.key && styles.filterChipActive
                  ]}
                  onPress={() => setActiveFilter(filter.key as FilterType)}
                >
                  <IconComponent 
                    size={16} 
                    color={activeFilter === filter.key ? "#ffffff" : "#6b7280"} 
                  />
                  <Text style={[
                    styles.filterText,
                    activeFilter === filter.key && styles.filterTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersRow}>
            {statusFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.statusFilterChip,
                  statusFilter === filter.key && styles.statusFilterChipActive
                ]}
                onPress={() => setStatusFilter(filter.key as StatusFilter)}
              >
                <Text style={[
                  styles.statusFilterText,
                  statusFilter === filter.key && styles.statusFilterTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Checklist Items */}
      <ScrollView style={styles.content}>
        {filteredItems.map((item) => {
          const execution = executions.find(e => e.checklist_item_id === item.id);
          
          return (
            <ChecklistItemCard
              key={item.id}
              item={item}
              execution={execution}
              onExecute={executeChecklistItem}
              onCreateCorrectiveAction={handleCreateCorrectiveAction}
            />
          );
        })}

        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <ClipboardCheck size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>
              Nenhum item encontrado com os filtros selecionados
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Corrective Action Modal */}
      <Modal
        visible={showCorrectiveForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CorrectiveActionForm
          checklistItemId={selectedItemId}
          onSave={handleSaveCorrectiveAction}
          onCancel={() => {
            setShowCorrectiveForm(false);
            setSelectedItemId('');
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  progressSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  alertSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  filtersSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusFilterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  statusFilterText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
});