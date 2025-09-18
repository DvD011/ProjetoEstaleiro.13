import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ModuleForm } from '@/components/inspection/ModuleForm';
import { router } from 'expo-router';

export default function ModuleDetailScreen() {
  const { id, moduleId } = useLocalSearchParams<{
    id: string;
    moduleId: string;
  }>();

  const handleSave = () => {
    // Navegar de volta para a tela de detalhes da inspeção
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  if (!id || !moduleId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Parâmetros inválidos</Text>
      </View>
    );
  }
  return (
    <ModuleForm
      inspectionId={id}
      moduleId={moduleId}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
});