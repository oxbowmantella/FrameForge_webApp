// Base Types
interface BaseComponent {
  id: string;
  name: string;
  price: number;
  image: string;
  type: ComponentType;
}

type ComponentType = 'case' | 'cpu' | 'cpuCooler' | 'gpu' | 'memory' | 'motherboard' | 'psu' | 'storage';

// CPU Types
interface CPUSpecifications {
  socket: string;
  coreCount: string;
  coreClock: string;
  boostClock: number;
  tdp: number;
  integratedGraphics?: string;
  includesCooler: boolean;
  cache: {
    l2: number;
    l3: number;
  };
  performanceScore: number;
}

interface CPU extends BaseComponent {
  type: 'cpu';
  specifications: CPUSpecifications;
}

// Motherboard Types
interface MotherboardSpecifications {
  socket: string;
  formFactor: string;
  chipset: string;
  manufacturer: string;
  memoryType: string;
  memoryMax: string;
  memorySlots: number;
  m2Slots: number;
  pciSlots: number;
  sataSlots: string;
}

interface Motherboard extends BaseComponent {
  type: 'motherboard';
  specifications: MotherboardSpecifications;
}

// GPU Types
interface GPUSpecifications {
  chipset: string;
  memory: string;
  memoryType: string;
  tdp: number;
  length: number;
  powerConnectors: string;
}

interface GPU extends BaseComponent {
  type: 'gpu';
  specifications: GPUSpecifications;
}

// Memory Types
interface MemorySpecifications {
  speed: string;
  modules: string;
  timing: string;
  voltage: string;
}

interface Memory extends BaseComponent {
  type: 'memory';
  specifications: MemorySpecifications;
}

// Storage Types
interface StorageSpecifications {
  capacity: number;
  type: string;
  formFactor: string;
  interface: string;
  isNVMe: boolean;
}

interface Storage extends BaseComponent {
  type: 'storage';
  specifications: StorageSpecifications;
}

// PSU Types
interface PSUSpecifications {
  wattage: number;
  efficiency: string;
  modular: string;
  connectors: {
    eps8pin: number;
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
  };
}

interface PSU extends BaseComponent {
  type: 'psu';
  specifications: PSUSpecifications;
}

// Case Types
interface CaseSpecifications {
  maxGpuLength: number;
  formFactors: string[];
  frontPorts: string;
  hasUSBC: boolean;
}

interface Case extends BaseComponent {
  type: 'case';
  specifications: CaseSpecifications;
}

// CPU Cooler Types
interface CPUCoolerSpecifications {
  type: 'Liquid' | 'Air';
  height: number;
  socket: string;
  tdpRating: string;
  noiseLevel: number;
  fanRPM: string;
  isWaterCooled: boolean;
  perfImprovement: number;
}

interface CPUCooler extends BaseComponent {
  type: 'cpuCooler';
  specifications: CPUCoolerSpecifications;
}

// Component Union Type
type PCComponent = CPU | Motherboard | GPU | Memory | Storage | PSU | Case | CPUCooler;

// Store State Interface
interface PCBuildState {
  budget: number;
  selectedType: string;
  totalSpent: number;
  components: {
    case: Case | null;
    cpu: CPU | null;
    cpuCooler: CPUCooler | null;
    gpu: GPU | null;
    memory: Memory | null;
    motherboard: Motherboard | null;
    psu: PSU | null;
    storage: Storage | null;
  };
  preferences: {
    cpuBrand: 'Intel' | 'AMD' | null;
    gpuBrand: 'NVIDIA' | 'AMD' | 'Integrated' | null;
    hasCPUCooler: boolean;
    hasIntegratedGraphics: boolean;
  };
}

// Store Actions Interface
interface PCBuildActions {
  setBudget: (budget: number) => void;
  setSelectedType: (type: string) => void;
  setComponent: (componentType: keyof PCBuildState['components'], component: PCComponent | null) => void;
  setCPUBrand: (brand: 'Intel' | 'AMD' | null) => void;
  setGPUBrand: (brand: 'NVIDIA' | 'AMD' | 'Integrated' | null) => void;
  setHasCPUCooler: (hasCooler: boolean) => void;
  setHasIntegratedGraphics: (hasIntegrated: boolean) => void;
  clearBuild: () => void;
  getRemainingBudget: () => number;
  isComponentSelected: (componentType: keyof PCBuildState['components']) => boolean;
}

export type { 
  PCBuildState,
  PCBuildActions,
  PCComponent,
  ComponentType,
  CPU,
  Motherboard,
  GPU,
  Memory,
  Storage,
  PSU,
  Case,
  CPUCooler,
  CPUSpecifications,
  MotherboardSpecifications,
  GPUSpecifications,
  MemorySpecifications,
  StorageSpecifications,
  PSUSpecifications,
  CaseSpecifications,
  CPUCoolerSpecifications
};