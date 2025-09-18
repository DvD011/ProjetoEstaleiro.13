import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react-native';

interface FlowNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  canSaveDraft: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  nextLabel?: string;
  backLabel?: string;
  draftLabel?: string;
  loading?: boolean;
  savingDraft?: boolean;
}

export const FlowNavigation: React.FC<FlowNavigationProps> = ({
  canGoBack,
  canGoNext,
  canSaveDraft,
  onBack,
  onNext,
  onSaveDraft,
  nextLabel = 'Próximo',
  backLabel = 'Voltar',
  draftLabel = 'Salvar Rascunho',
  loading = false,
  savingDraft = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {canGoBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={loading || savingDraft}
          >
            <ArrowLeft size={20} color="#6b7280" />
            <Text style={styles.backButtonText}>{backLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        {canSaveDraft && (
          <TouchableOpacity
            style={[styles.draftButton, savingDraft && styles.draftButtonDisabled]}
            onPress={onSaveDraft}
            disabled={savingDraft || loading}
          >
            <Save size={16} color="#6b7280" />
            <Text style={styles.draftButtonText}>
              {savingDraft ? 'Salvando...' : draftLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!canGoNext || loading || savingDraft) && styles.nextButtonDisabled
          ]}
          onPress={onNext}
          disabled={!canGoNext || loading || savingDraft}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Carregando...' : nextLabel}
          </Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    gap: 4,
  },
  draftButtonDisabled: {
    opacity: 0.6,
  },
  draftButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});