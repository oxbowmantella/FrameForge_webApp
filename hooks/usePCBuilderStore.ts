import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PCBuildState, PCPart } from '@/types/pc-builder';

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
    logStoreState: () => void;
  }>(
    (set, get) => ({
      ...defaultState,

      setBudget: (budget: number) => {
        set({ budget });
      },

      setSelectedType: (type: string) => {
        set({ selectedType: type });
      },

      setComponent: (componentType, component) => {
        
        set((state) => {
          const newComponents = {
            ...state.components,
            [componentType]: component
          };
          const newTotal = calculateTotalSpent(newComponents);
          
          
          return {
            ...state,
            components: newComponents,
            totalSpent: newTotal
          };
        });
      },

      setCPUBrand: (brand) => {
        
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            cpuBrand: brand
          }
        }));
      },

      setGPUBrand: (brand) => {
      
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            gpuBrand: brand
          }
        }));
      },

      setHasCPUCooler: (hasCooler) => {
      
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            hasCPUCooler: hasCooler
          }
        }));
      },

      setHasIntegratedGraphics: (hasIntegrated) => {
      
        
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            hasIntegratedGraphics: hasIntegrated
          }
        }));
      },

      clearBuild: () => {
      
        
        set(defaultState);
      },

      getRemainingBudget: () => {
        const state = get();
        const remaining = state.budget - state.totalSpent;
        
      
        
        return remaining;
      },

      isComponentSelected: (componentType) => {
        const state = get();
        const isSelected = state.components[componentType] !== null;
        
      
        
        return isSelected;
      }
    }),
    {
      name: 'pc-builder-storage',
      skipHydration: true,
    }
  )
);