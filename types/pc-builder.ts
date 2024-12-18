export interface PCPart {
  id: string;
  name: string;
  manufacturer: string;
  price: number;
  specifications: Record<string, any>;
}

export interface PCBuildState {
  budget: number;
  selectedType: string;
  totalSpent: number;
  components: {
    case: PCPart | null;
    cpuCooler: PCPart | null;
    cpu: PCPart | null;
    gpu: PCPart | null;
    memory: PCPart | null;
    motherboard: PCPart | null;
    powerSupply: PCPart | null;
    storage: PCPart | null;
  };
}