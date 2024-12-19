// Common interfaces
interface BaseSpecifications {
  manufacturer: string;
}

// Component-specific specification interfaces
interface MotherboardSpecifications extends BaseSpecifications {
  socket: string;
  formFactor: string;
  chipset: string;
  memoryType: string;
  memoryMax: string;
  memorySlots: number;
  m2Slots: number;
  pciSlots: number;
  sataSlots: number;
  wirelessNetworking?: string;
  usb32Gen2Headers?: number;
  usb32Gen1Headers?: number;
}

interface CPUSpecifications extends BaseSpecifications {
  socket: string;
  cores: number;
  threads: number;
  baseClock: number;
  boostClock: number;
  tdp: number;
  cache: {
    l1?: number;
    l2?: number;
    l3?: number;
  };
  integratedGraphics?: string;
}

interface GPUSpecifications extends BaseSpecifications {
  chipset: string;
  memory: {
    size: number;
    type: string;
    clock: number;
  };
  coreClock: number;
  boostClock: number;
  length: number;
  tdp: number;
  powerConnectors: string[];
  outputs: {
    hdmi?: number;
    displayPort?: number;
    usbc?: number;
  };
}

interface MemorySpecifications extends BaseSpecifications {
  capacity: number;
  type: string;
  speed: number;
  modules: number;
  timing: string;
  voltage: number;
  ecc: boolean;
  heatSpreader: boolean;
}

interface StorageSpecifications extends BaseSpecifications {
  capacity: number;
  type: 'SSD' | 'HDD' | 'NVMe';
  formFactor: string;
  interface: string;
  cache?: number;
  readSpeed?: number;
  writeSpeed?: number;
  tbw?: number;
}

interface PowerSupplySpecifications extends BaseSpecifications {
  wattage: number;
  efficiency: string;
  modular: 'Full' | 'Semi' | 'No';
  formFactor: string;
  connectors: {
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
    eps: number;
  };
  fanless: boolean;
}

interface CaseSpecifications extends BaseSpecifications {
  formFactor: string[];
  dimensions: {
    height: number;
    width: number;
    depth: number;
  };
  maxGPULength: number;
  maxCPUCoolerHeight: number;
  driveBays: {
    internal25: number;
    internal35: number;
    external525?: number;
  };
  fans: {
    included: number;
    maxSupported: number;
  };
  radiatorSupport: string[];
  sidePanelWindow: boolean;
}

interface CPUCoolerSpecifications extends BaseSpecifications {
  type: 'Air' | 'AIO' | 'Custom';
  height?: number;
  radiatorSize?: number;
  sockets: string[];
  fanRPM: {
    min: number;
    max: number;
  };
  noiseLevel: {
    min: number;
    max: number;
  };
  tdp: number;
}

// Component type with specific specifications
export interface PCPart {
  id: string;
  name: string;
  manufacturer: string;
  image: string;
  price: number;
  type: keyof PCBuildState['components'];
  specifications: 
    | MotherboardSpecifications 
    | CPUSpecifications 
    | GPUSpecifications 
    | MemorySpecifications 
    | StorageSpecifications 
    | PowerSupplySpecifications 
    | CaseSpecifications 
    | CPUCoolerSpecifications;
}

// The main state interface
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

// Type guard functions to check specification types
export function isMotherboardSpec(spec: any): spec is MotherboardSpecifications {
  return 'socket' in spec && 'formFactor' in spec && 'chipset' in spec;
}

export function isCPUSpec(spec: any): spec is CPUSpecifications {
  return 'cores' in spec && 'threads' in spec && 'socket' in spec;
}

export function isGPUSpec(spec: any): spec is GPUSpecifications {
  return 'chipset' in spec && 'memory' in spec && 'coreClock' in spec;
}