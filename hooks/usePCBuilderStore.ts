// usePCBuilderStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PCBuildState, PCPart } from '@/types/pc-builder';

const defaultState: PCBuildState = {
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
    storage: null
  }
};

// Calculate total spent helper
const calculateTotalSpent = (components: PCBuildState['components']): number => {
  return Object.values(components).reduce((total, component) => {
    return total + (component?.price || 0);
  }, 0);
};

export const usePCBuilderStore = create(
  persist<PCBuildState & {
    setBudget: (budget: number) => void;
    setSelectedType: (type: string) => void;
    setComponent: (componentType: keyof PCBuildState['components'], component: PCPart | null) => void;
    clearBuild: () => void;
    getRemainingBudget: () => number;
    isComponentSelected: (componentType: keyof PCBuildState['components']) => boolean;
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
          return {
            ...state,
            components: newComponents,
            totalSpent: calculateTotalSpent(newComponents)
          };
        });
      },

      clearBuild: () => {
        set(defaultState);
      },

      getRemainingBudget: () => {
        const state = get();
        return state.budget - state.totalSpent;
      },

      isComponentSelected: (componentType) => {
        const state = get();
        return state.components[componentType] !== null;
      }
    }),
    {
      name: 'pc-builder-storage',
      skipHydration: true, // Important for Next.js
    }
  )
);