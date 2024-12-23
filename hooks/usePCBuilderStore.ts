import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PCBuildState, PCPart } from '@/types/pc-builder';

// Logging utility
const logStateChange = (action: string, data: any) => {
  console.group(`🔄 PC Builder Store Update: ${action}`);
  console.log('Data:', data);
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();
};

// Extended PCBuildState type
interface ExtendedPCBuildState extends PCBuildState {
  preferences: {
    cpuBrand: 'Intel' | 'AMD' | null;
    gpuBrand: 'NVIDIA' | 'AMD' | 'Integrated' | null;
    hasCPUCooler: boolean;
    hasIntegratedGraphics: boolean;
  };
}

const defaultState: ExtendedPCBuildState = {
  budget: 0,
  selectedType: '',
  totalSpent: 0,
  components: {
    case: null,
    cpuCooler: null,
    cpu: null,
    gpu: null,
    memory: null,
    motherboard: null,
    powerSupply: null,
    storage: null,
    cooler: null,
    psu: null
  },
  preferences: {
    cpuBrand: null,
    gpuBrand: null,
    hasCPUCooler: false,
    hasIntegratedGraphics: false
  }
};

// Calculate total spent helper
const calculateTotalSpent = (components: ExtendedPCBuildState['components']): number => {
  const total = Object.values(components).reduce((total, component) => {
    return total + (component?.price || 0);
  }, 0);
  
  logStateChange('Calculate Total Spent', { total, components });
  return total;
};

export const usePCBuilderStore = create(
  persist<ExtendedPCBuildState & {
    setBudget: (budget: number) => void;
    setSelectedType: (type: string) => void;
    setComponent: (componentType: keyof ExtendedPCBuildState['components'], component: PCPart | null) => void;
    setCPUBrand: (brand: 'Intel' | 'AMD' | null) => void;
    setGPUBrand: (brand: "NVIDIA" | "AMD" | "Integrated" | null) => void;
    setHasCPUCooler: (hasCooler: boolean) => void;
    setHasIntegratedGraphics: (hasIntegrated: boolean) => void;
    clearBuild: () => void;
    getRemainingBudget: () => number;
    isComponentSelected: (componentType: keyof ExtendedPCBuildState['components']) => boolean;
  }>(
    (set, get) => ({
      ...defaultState,

      setBudget: (budget: number) => {
        logStateChange('Set Budget', { budget });
        set({ budget });
      },

      setSelectedType: (type: string) => {
        logStateChange('Set Selected Type', { type });
        set({ selectedType: type });
      },

      setComponent: (componentType, component) => {
        console.log("Current State : ", component);
        
        logStateChange('Set Component', { 
          type: componentType, 
          component,
          previousComponent: get().components[componentType]
        });
        
        set((state) => {
          const newComponents = {
            ...state.components,
            [componentType]: component
          };
          const newTotal = calculateTotalSpent(newComponents);
          
          logStateChange('Update Total After Component Change', { 
            previousTotal: state.totalSpent,
            newTotal
          });
          
          return {
            ...state,
            components: newComponents,
            totalSpent: newTotal
          };
        });
      },

      setCPUBrand: (brand) => {
        logStateChange('Set CPU Brand', { 
          previousBrand: get().preferences.cpuBrand,
          newBrand: brand 
        });
        
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            cpuBrand: brand
          }
        }));
      },

      setGPUBrand: (brand) => {
        logStateChange('Set GPU Brand', { 
          previousBrand: get().preferences.gpuBrand,
          newBrand: brand 
        });
        
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            gpuBrand: brand
          }
        }));
      },

      setHasCPUCooler: (hasCooler) => {
        logStateChange('Set Has CPU Cooler', { 
          previous: get().preferences.hasCPUCooler,
          new: hasCooler 
        });
        
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            hasCPUCooler: hasCooler
          }
        }));
      },

      setHasIntegratedGraphics: (hasIntegrated) => {
        logStateChange('Set Has Integrated Graphics', { 
          previous: get().preferences.hasIntegratedGraphics,
          new: hasIntegrated 
        });
        
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            hasIntegratedGraphics: hasIntegrated
          }
        }));
      },

      clearBuild: () => {
        logStateChange('Clear Build', { 
          previousState: get(),
          newState: defaultState 
        });
        
        set(defaultState);
      },

      getRemainingBudget: () => {
        const state = get();
        const remaining = state.budget - state.totalSpent;
        
        logStateChange('Get Remaining Budget', { 
          budget: state.budget,
          spent: state.totalSpent,
          remaining 
        });
        
        return remaining;
      },

      isComponentSelected: (componentType) => {
        const state = get();
        const isSelected = state.components[componentType] !== null;
        
        logStateChange('Check Component Selected', { 
          componentType,
          isSelected 
        });
        
        return isSelected;
      }
    }),
    {
      name: 'pc-builder-storage',
      skipHydration: true,
    }
  )
);