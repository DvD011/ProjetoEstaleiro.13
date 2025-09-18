import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export interface FlowStep {
  id: string;
  title: string;
  completed: boolean;
  required: boolean;
  data?: Record<string, any>;
}

export interface FlowValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useOptimizedFlow = (inspectionId: string) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<FlowStep[]>([
    {
      id: 'metadata',
      title: 'Dados Iniciais',
      completed: false,
      required: true,
    },
    {
      id: 'photos',
      title: 'Fotos Obrigatórias',
      completed: false,
      required: true,
    },
    {
      id: 'checklist',
      title: 'Checklist Preventivo',
      completed: false,
      required: true,
    },
    {
      id: 'corrective',
      title: 'Ações Corretivas',
      completed: false,
      required: false,
    },
    {
      id: 'review',
      title: 'Revisão e Assinatura',
      completed: false,
      required: true,
    },
    {
      id: 'report',
      title: 'Geração de Relatório',
      completed: false,
      required: true,
    },
  ]);

  const validateStep = useCallback((stepId: string, data: Record<string, any>): FlowValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (stepId) {
      case 'metadata':
        if (!data.client_name?.trim()) errors.push('Nome do Cliente é obrigatório');
        if (!data.endereco_completo?.trim()) errors.push('Endereço é obrigatório');
        if (!data.responsavel_local?.trim()) errors.push('Responsável Local é obrigatório');
        if (!data.authorization) errors.push('Autorização é obrigatória');
        if (!data.cabin_type) errors.push('Tipo de Cabine é obrigatório');
        break;

      case 'photos':
        const requiredPhotos = ['fachada', 'proximidade', 'placa', 'quadro_geral'];
        const missingPhotos = requiredPhotos.filter(photo => !data[photo]);
        if (missingPhotos.length > 0) {
          errors.push(`Fotos obrigatórias ausentes: ${missingPhotos.join(', ')}`);
        }
        break;

      case 'review':
        if (!data.conclusion?.trim()) errors.push('Conclusão é obrigatória');
        if (!data.overall_condition) errors.push('Condição Geral é obrigatória');
        if (!data.compliance_status) errors.push('Status de Conformidade é obrigatório');
        if (!data.signature) errors.push('Assinatura é obrigatória');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  const completeStep = useCallback((stepId: string, data?: Record<string, any>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, completed: true, data: { ...step.data, ...data } }
        : step
    ));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  const goToNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const getOverallProgress = useCallback(() => {
    const completedSteps = steps.filter(step => step.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  }, [steps]);

  const canProceedToNext = useCallback(() => {
    const currentStepData = steps[currentStep];
    if (!currentStepData.required) return true;
    
    return currentStepData.completed;
  }, [steps, currentStep]);

  const saveDraft = useCallback(async (stepId: string, data: Record<string, any>) => {
    try {
      // Save draft data to local storage or database
      console.log(`Saving draft for step ${stepId}:`, data);
      
      // Update step data
      setSteps(prev => prev.map(step => 
        step.id === stepId 
          ? { ...step, data: { ...step.data, ...data } }
          : step
      ));

      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      return false;
    }
  }, []);

  return {
    currentStep,
    steps,
    validateStep,
    completeStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    getOverallProgress,
    canProceedToNext,
    saveDraft,
  };
};