import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

// Type definitions to match store
type GPUBrand = 'NVIDIA' | 'AMD' | 'Integrated' | null;

interface SystemRequirements {
  cpuName: string;
  cpuTier: 'ENTRY' | 'MID' | 'HIGH' | 'ULTRA';
  powerLimit: number;
  lengthLimit: number;
  pciVersion: string;
  tdpBudget: number;
}

interface IGPUAnalysis {
  available: boolean;
  name?: string;
  sufficient?: boolean;
  recommendation?: string;
  performanceInsights?: string[];
  buildTier?: 'budget' | 'midRange' | 'highEnd';
  recommendedRange?: {
    min: number;
    max: number;
  };
}

interface RequestPayload {
  budget: number;
  page?: number;
  itemsPerPage?: number;
  searchTerm?: string;
  components: {
    cpu: any;
    psu: any;
    case: any;
    motherboard: any;
    memory: any;
    storage: any;
  };
  preferences: {
    gpuBrand: GPUBrand;
  };
}

// Performance tier mappings
const CPU_TIERS = {
  ENTRY: ['i3', 'ryzen 3'],
  MID: ['i5', 'ryzen 5'],
  HIGH: ['i7', 'ryzen 7'],
  ULTRA: ['i9', 'ryzen 9', 'threadripper']
} as const;

const GPU_TIERS = {
  ENTRY: { 
    tdpRange: [75, 150], 
    memoryRange: [4, 8],
    uses: ['1080p gaming', 'esports titles', 'content streaming']
  },
  MID: { 
    tdpRange: [150, 220], 
    memoryRange: [8, 12],
    uses: ['1440p gaming', 'content creation', 'VR gaming']
  },
  HIGH: { 
    tdpRange: [220, 320], 
    memoryRange: [12, 16],
    uses: ['4K gaming', 'professional workloads', 'streaming while gaming']
  },
  ULTRA: { 
    tdpRange: [320, 450], 
    memoryRange: [16, 24],
    uses: ['4K high refresh rate', '3D rendering', 'machine learning']
  }
} as const;

// Logging utility
const debugLog = (step: string, data: any) => {
  console.group(`🔄 ${step}`);
  console.log(JSON.stringify(data, null, 2));
  console.timeStamp();
  console.groupEnd();
};

// Analyze integrated graphics capabilities
const analyzeIntegratedGraphics = (components: any, budget: number): IGPUAnalysis => {
  const igpu = components.cpu?.specifications?.integratedGraphics;
  
  if (!igpu || igpu === "None") {
    return { available: false };
  }

  const isBudgetBuild = budget <= 1000;
  const isMidRangeBuild = budget > 1000 && budget <= 2000;
  const isHighEndBuild = budget > 2000;

  let recommendation: string;
  let performanceInsights: string[] = [];
  let recommendedRange = {
    min: budget * 0.25,
    max: budget * 0.4
  };

  if (isBudgetBuild) {
    recommendation = `Your CPU includes ${igpu} graphics, suitable for basic computing and light gaming at 1080p. A dedicated GPU would provide significant performance improvements but is optional at this budget.`;
    performanceInsights = [
      "Capable of running esports titles at 1080p with medium settings",
      "Suitable for content streaming and basic productivity tasks",
      "Adding a dedicated GPU in the $150-$300 range would provide 2-3x better gaming performance",
      "Consider a GPU if you plan to play modern games or do content creation"
    ];
  } else if (isMidRangeBuild) {
    recommendation = `While your CPU includes ${igpu} graphics, we recommend adding a dedicated GPU to fully utilize your system's potential at this budget range.`;
    performanceInsights = [
      "Current integrated graphics will limit gaming capabilities",
      "A dedicated GPU would provide 4-5x better gaming performance",
      "Enable features like ray tracing and DLSS/FSR for better visuals",
      "Significantly improve rendering times in content creation applications"
    ];
  } else {
    recommendation = `Although your CPU includes ${igpu} graphics, for optimal performance at this budget, a dedicated GPU is strongly recommended.`;
    performanceInsights = [
      "Integrated graphics would significantly limit system potential",
      "A dedicated GPU would provide 5-8x better gaming performance",
      "Enable 4K gaming and professional workload acceleration",
      "Support ML/AI tasks and advanced rendering features"
    ];
  }

  return {
    available: true,
    name: igpu,
    sufficient: isBudgetBuild,
    recommendation,
    performanceInsights,
    buildTier: isBudgetBuild ? "budget" : isMidRangeBuild ? "midRange" : "highEnd",
    recommendedRange
  };
};

// Determine CPU performance tier
const determinePerformanceTier = (cpu: any): keyof typeof GPU_TIERS => {
  const cpuModel = cpu?.name?.toLowerCase() || '';
  
  if (CPU_TIERS.ULTRA.some(model => cpuModel.includes(model))) return 'ULTRA';
  if (CPU_TIERS.HIGH.some(model => cpuModel.includes(model))) return 'HIGH';
  if (CPU_TIERS.MID.some(model => cpuModel.includes(model))) return 'MID';
  return 'ENTRY';
};

// Calculate system power budget
const calculateSystemPower = (components: any): number => {
  let basePower = 150;
  
  const cpuTDP = parseInt(components.cpu?.specifications?.tdp) || 125;
  const memoryPower = Math.ceil(parseInt(components.memory?.specifications?.capacity || '16') / 8) * 3;
  const storagePower = components.storage ? 10 : 5;
  
  return basePower + cpuTDP + memoryPower + storagePower;
};

// Parse GPU data from content
const parseGPUData = (content: string): Record<string, any> => {
  return content.split('\n').reduce((acc, line) => {
    const [key, ...values] = line.split(':');
    if (key && values.length) {
      acc[key.trim()] = values.join(':').trim();
    }
    return acc;
  }, {} as Record<string, any>);
};

// Calculate GPU match score
const calculateMatchScore = (
  gpuData: Record<string, any>,
  systemReqs: SystemRequirements,
  gpuBrand: GPUBrand
): number => {
  let score = 0;
  const targetTier = GPU_TIERS[systemReqs.cpuTier];
  
  // Performance match (40 points)
  const gpuTDP = parseInt(gpuData.TDP) || 0;
  if (gpuTDP >= targetTier.tdpRange[0] && gpuTDP <= targetTier.tdpRange[1]) {
    score += 40;
  } else if (gpuTDP >= targetTier.tdpRange[0] * 0.8) {
    score += 30;
  } else if (gpuTDP >= targetTier.tdpRange[0] * 0.6) {
    score += 20;
  }

  // Memory capacity (20 points)
  const gpuMemory = parseInt(gpuData.Memory) || 0;
  if (gpuMemory >= targetTier.memoryRange[0] && gpuMemory <= targetTier.memoryRange[1]) {
    score += 20;
  } else if (gpuMemory >= targetTier.memoryRange[0] * 0.8) {
    score += 15;
  }

  // Power compatibility (20 points)
  if (gpuTDP <= systemReqs.tdpBudget) {
    score += 20;
  } else if (gpuTDP <= systemReqs.tdpBudget * 1.1) {
    score += 10;
  }

  // Physical compatibility (20 points)
  const gpuLength = parseInt(gpuData.Length) || 0;
  if (gpuLength <= systemReqs.lengthLimit) {
    score += 20;
  }

  return Math.min(score, 100);
};

// Generate performance insights
const generatePerformanceInsights = (
  gpuData: Record<string, any>,
  systemReqs: SystemRequirements,
  gpuBrand: GPUBrand
): string[] => {
  if (!gpuBrand || gpuBrand === 'Integrated') return [];
  
  const insights: string[] = [];
  const cpuName = systemReqs.cpuName || 'your CPU';
  const tierUses = GPU_TIERS[systemReqs.cpuTier].uses;

  insights.push(
    `Optimized for ${tierUses.join(', ')}`,
    `${gpuData.Memory} ${gpuData['Memory Type']} memory provides sufficient bandwidth for ${systemReqs.cpuTier.toLowerCase()}-tier workloads`,
    `Core/Boost clocks of ${gpuData['Core Clock']}/${gpuData['Boost Clock']} complement ${cpuName}`
  );

  if (gpuBrand === 'NVIDIA') {
    insights.push(
      'DLSS support for enhanced performance in supported games',
      'NVIDIA NVENC for efficient streaming and recording',
      'Ray tracing capabilities for enhanced visual quality'
    );
  } else if (gpuBrand === 'AMD') {
    insights.push(
      'AMD FSR support for upscaling performance',
      'AMD Smart Access Memory compatibility with AMD CPUs',
      'Radeon Anti-Lag for reduced input latency'
    );
  }

  return insights;
};

// Generate search context
const generateSearchContext = (
  components: any,
  budget: number,
  gpuBrand: GPUBrand,
  systemReqs: SystemRequirements
): string => {
  if (!gpuBrand || gpuBrand === 'Integrated') {
    return '';
  }

  return `
    Find ${gpuBrand} graphics cards matching:
    - PCIe ${systemReqs.pciVersion} support
    - TDP range ${systemReqs.tdpBudget}W max
    - Price range $${(budget * 0.35).toFixed(0)} to $${(budget * 0.45).toFixed(0)}
    - Length under ${systemReqs.lengthLimit}mm
    - ${gpuBrand === 'NVIDIA' ? 'RTX/GTX series' : 'RX series'}
    - Optimized for ${systemReqs.cpuTier.toLowerCase()}-tier performance
    Features:
    ${gpuBrand === 'NVIDIA' 
      ? '- DLSS and Ray Tracing\n- NVENC encoder\n- G-Sync' 
      : '- FSR technology\n- FreeSync\n- Smart Access Memory'}
    Primary uses: ${GPU_TIERS[systemReqs.cpuTier].uses.join(', ')}
  `.trim();
};

export async function POST(req: Request) {
  try {
    const { 
      budget, 
      page = 1, 
      itemsPerPage = 10, 
      searchTerm = "", 
      components,
      preferences 
    }: RequestPayload = await req.json();
    
    debugLog('Request Parameters', { budget, page, components, preferences });

    // Get GPU brand preference and handle integrated graphics case
    const gpuBrand = preferences?.gpuBrand ?? null;
    debugLog('GPU Brand Preference', { gpuBrand });

    if (gpuBrand === 'Integrated') {
      // Return early with integrated graphics analysis
      const igpuAnalysis = analyzeIntegratedGraphics(components, budget);
      return new NextResponse(JSON.stringify({
        gpus: [],
        totalCount: 0,
        page,
        itemsPerPage,
        searchTerm,
        budget,
        integratedGraphics: igpuAnalysis,
        systemInfo: {
          hasIntegratedGraphics: igpuAnalysis.available,
          integratedGraphicsName: igpuAnalysis.available ? igpuAnalysis.name : null
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // System requirements analysis
    const cpuTier = determinePerformanceTier(components.cpu);
    const systemPower = calculateSystemPower(components);
    const psuWattage = components.psu?.specifications?.wattage || 850;
    const tdpBudget = psuWattage - systemPower;
    
    const systemReqs: SystemRequirements = {
      cpuTier,
      powerLimit: psuWattage,
      lengthLimit: components.case?.specifications?.maxGpuLength || 400,
      pciVersion: components.motherboard?.specifications?.pcieVersion || '4.0',
      tdpBudget,
      cpuName: components.cpu?.name
    };

    // Analyze integrated graphics
    const igpuAnalysis = analyzeIntegratedGraphics(components, budget);
    
    // Skip GPU search if no valid brand preference
    if (!gpuBrand || (gpuBrand !== 'NVIDIA' && gpuBrand !== 'AMD')) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid GPU brand preference',
        details: 'Please select either NVIDIA or AMD as your GPU brand preference',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize AI services
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    // Perform search
    const searchContext = generateSearchContext(components, budget, gpuBrand, systemReqs);
    debugLog('Search Context', searchContext);

    if (!searchContext) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid search context',
        details: 'Unable to generate search parameters',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchResults = await vectorStore.similaritySearch(
      searchContext + (searchTerm ? `\nAdditional criteria: ${searchTerm}` : ''),
      30
    );
    
    debugLog('Search Results Count', searchResults.length);
    debugLog('Search Results Sample', searchResults.slice(0, 3));

    // Process results
    const gpus = searchResults
      .map(result => {
        const data = parseGPUData(result.pageContent);
     if (!data.Name || !data.Price || !data.Manufacturer?.toLowerCase().includes(gpuBrand.toLowerCase())) {
          return null;
        }

        const price = parseFloat(data.Price.replace(/[$,]/g, ''));
        const length = parseInt(data.Length) || 0;
        
        // Budget and physical constraints check
        if (price < budget * 0.25 || price > budget * 0.4 || length > systemReqs.lengthLimit) {
          return null;
        }

        const matchScore = calculateMatchScore(data, systemReqs, gpuBrand);
        
        return {
          id: `gpu-${data.Name.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
          name: data.Name,
          image: data['Image URL'] || '',
          manufacturer: data.Manufacturer || gpuBrand,
          price,
          chipset: data.Chipset || 'Unknown',
          memory: data.Memory || 'Unknown',
          memoryType: data['Memory Type'] || 'GDDR6',
          coreClock: data['Core Clock'] || 'Unknown',
          boostClock: data['Boost Clock'] || 'Unknown',
          length: data.Length || 'Unknown',
          tdp: data.TDP || 'Unknown',
          powerConnectors: data['External Power'] || 'Unknown',
          outputs: {
            hdmi: data['HDMI Outputs'] || '0',
            displayPort: data['DisplayPort Outputs'] || '0',
          },
          score: matchScore,
          isRecommended: matchScore >= 80,
          compatibility: {
            powerOk: parseInt(data.TDP) <= systemReqs.tdpBudget,
            lengthOk: length <= systemReqs.lengthLimit,
            tdpOk: parseInt(data.TDP) <= systemReqs.powerLimit
          },
          insights: generatePerformanceInsights(data, systemReqs, gpuBrand),
          brandFeatures: gpuBrand === 'NVIDIA' 
            ? ['DLSS', 'Ray Tracing', 'NVENC']
            : ['FSR', 'Radeon Anti-Lag', 'RSR']
        };
      })
      .filter((gpu): gpu is NonNullable<typeof gpu> => gpu !== null)
      .sort((a, b) => b.score - a.score);

    // Handle no results case
    if (gpus.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible GPUs found',
        details: 'No GPUs match your criteria. Try adjusting your budget or requirements.',
        searchCriteria: {
          budget: {
            min: budget * 0.25,
            max: budget * 0.4
          },
          brand: gpuBrand,
          powerLimit: systemReqs.tdpBudget,
          lengthLimit: systemReqs.lengthLimit
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pagination
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedGPUs = gpus.slice(startIndex, startIndex + itemsPerPage);

    // Prepare response
    const response = {
      gpus: paginatedGPUs,
      totalCount: gpus.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      integratedGraphics: igpuAnalysis,
      systemInfo: {
        cpuTier,
        availablePower: tdpBudget,
        maxLength: systemReqs.lengthLimit,
        pciVersion: systemReqs.pciVersion,
        totalBudget: budget,
        allocatedBudget: {
          min: budget * 0.25,
          max: budget * 0.4
        },
        hasIntegratedGraphics: igpuAnalysis.available,
        integratedGraphicsName: igpuAnalysis.available ? igpuAnalysis.name : null,
        selectedBrand: gpuBrand
      },
      searchCriteria: {
        priceRange: {
          min: budget * 0.25,
          max: budget * 0.4
        },
        powerLimit: tdpBudget,
        lengthLimit: systemReqs.lengthLimit,
        features: gpuBrand === 'NVIDIA' 
          ? ['DLSS', 'Ray Tracing', 'NVENC']
          : ['FSR', 'Smart Access Memory', 'Anti-Lag']
      }
    };

    debugLog('Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.gpus.length,
      hasIntegratedGraphics: igpuAnalysis.available,
      selectedBrand: gpuBrand
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process GPU recommendations',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}