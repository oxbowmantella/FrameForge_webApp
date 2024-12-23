import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

interface CPUDetails {
  socket: string;
  specifications: {
    tdp: number;
    integratedGraphics?: string;
    memoryType?: string;
    coreCount: string;
  };
}

interface RequestPayload {
  budget: number;
  cpuBrand: string | null;
  selectedCPU: CPUDetails | null;
  page?: number;
  itemsPerPage?: number;
  searchTerm?: string;
}

// Debug logging utility
const debugLog = (step: string, data: any) => {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

// Get budget tier constraints
const getMotherboardBudgetTier = (totalBudget: number) => {
  if (totalBudget <= 1000) {
    return {
      percentage: { min: 0.08, max: 0.12 },
      features: ['Basic VRMs', 'Essential I/O'],
      priceRange: { min: totalBudget * 0.08, max: totalBudget * 0.12 }
    };
  }
  if (totalBudget <= 2000) {
    return {
      percentage: { min: 0.10, max: 0.15 },
      features: ['Better VRMs', 'USB 3.2', 'M.2 Support'],
      priceRange: { min: totalBudget * 0.10, max: totalBudget * 0.15 }
    };
  }
  return {
    percentage: { min: 0.12, max: 0.18 },
    features: ['Premium VRMs', 'PCIe 4.0/5.0', 'Multiple M.2', 'WiFi 6/6E'],
    priceRange: { min: totalBudget * 0.12, max: totalBudget * 0.18 }
  };
};

// Get compatible sockets
const getCompatibleSockets = (cpuBrand: string | null, selectedCPU: CPUDetails | null) => {
  if (selectedCPU?.socket) {
    return [selectedCPU.socket];
  }

  const socketMap = {
    AMD: ['AM5', 'AM4'],
    Intel: ['LGA1700', 'LGA1200']
  };
  return cpuBrand ? socketMap[cpuBrand as keyof typeof socketMap] : [...socketMap.AMD, ...socketMap.Intel];
};

// Parse motherboard data
const parseMotherboardData = (content: string) => {
  const lines = content.split('\n');
  const data: Record<string, string> = {};
  
  lines.forEach(line => {
    const [key, ...values] = line.split(':');
    if (key && values.length) {
      data[key.trim()] = values.join(':').trim();
    }
  });
  
  return data;
};

// Calculate compatibility score
const calculateCompatibilityScore = (
  motherboard: any,
  cpuBrand: string | null,
  selectedCPU: CPUDetails | null,
  tierInfo: ReturnType<typeof getMotherboardBudgetTier>
) => {
  let score = 0;
  const maxScore = 100;

  // Socket compatibility (0-30 points)
  if (selectedCPU?.socket && 
      motherboard.socket?.toLowerCase().includes(selectedCPU.socket.toLowerCase())) {
    score += 30;
  } else {
    const compatibleSockets = getCompatibleSockets(cpuBrand, selectedCPU);
    if (compatibleSockets.some(socket => 
      motherboard.socket?.toLowerCase().includes(socket.toLowerCase()))) {
      score += 20;
    }
  }

  // Memory compatibility (0-20 points)
  if (selectedCPU?.specifications?.memoryType) {
    if (motherboard.memoryType?.includes(selectedCPU.specifications.memoryType)) {
      score += 20;
    }
  } else {
    if (motherboard.memoryType?.includes('DDR5')) {
      score += 15;
    } else if (motherboard.memoryType?.includes('DDR4')) {
      score += 10;
    }
  }

  // Power delivery and VRM considerations (0-20 points)
  if (selectedCPU?.specifications?.tdp) {
    const tdp = selectedCPU.specifications.tdp;
    const price = parseFloat(motherboard.price);
    if (tdp > 105 && price >= tierInfo.priceRange.max * 0.8) {
      score += 20;
    } else if (tdp > 65 && price >= tierInfo.priceRange.min * 1.2) {
      score += 15;
    } else if (tdp <= 65) {
      score += 10;
    }
  }

  // Feature scoring (0-30 points)
  let featureScore = 0;
  
  // PCIe configuration
  const coreCount = parseInt(selectedCPU?.specifications?.coreCount || '0');
  if (coreCount > 8 && parseInt(motherboard.pciSlots) >= 2) {
    featureScore += 10;
  }
  
  // Storage and expansion
  if (parseInt(motherboard.m2Slots) >= 2) featureScore += 5;
  
  // Connectivity
  if (motherboard.wirelessNetworking?.toLowerCase().includes('wifi 6')) featureScore += 5;
  if (parseInt(motherboard.usb32Gen2Headers) > 0) featureScore += 5;
  
  // IGP support
  if (selectedCPU?.specifications?.integratedGraphics && 
      motherboard.specifications?.includes('Display Outputs')) {
    featureScore += 5;
  }

  score += Math.min(30, featureScore);
  return Math.min(maxScore, Math.round(score));
};

// Generate recommendation reasons
const generateRecommendationReasons = (
  motherboard: any,
  score: number,
  selectedCPU: CPUDetails | null,
  tierInfo: ReturnType<typeof getMotherboardBudgetTier>
) => {
  const reasons: string[] = [];

  // CPU compatibility reasons
  if (selectedCPU) {
    reasons.push(`Optimal socket compatibility with your ${selectedCPU.socket} CPU`);
    
    if (selectedCPU.specifications.tdp > 105) {
      reasons.push(`VRM design supports high-performance ${selectedCPU.specifications.tdp}W processor`);
    }
    
    if (selectedCPU.specifications.integratedGraphics) {
      reasons.push(`Includes display outputs for integrated graphics support`);
    }

    if (parseInt(selectedCPU.specifications.coreCount) > 8) {
      reasons.push(`PCIe layout optimized for high-core-count CPU capabilities`);
    }
  } else {
    reasons.push(`Supports ${motherboard.socket} processors`);
  }

  // Memory capabilities
  if (motherboard.memoryType && motherboard.memoryMax) {
    reasons.push(
      `Supports up to ${motherboard.memoryMax}GB of ${motherboard.memoryType} memory${
        selectedCPU?.specifications?.memoryType ? ' (optimal for CPU)' : ''
      }`
    );
  }

  // Storage and expansion
  if (parseInt(motherboard.m2Slots) > 0) {
    reasons.push(`Features ${motherboard.m2Slots} M.2 slots for NVMe storage`);
  }

  // Connectivity features
  if (motherboard.wirelessNetworking && motherboard.wirelessNetworking !== 'None') {
    reasons.push(`Built-in ${motherboard.wirelessNetworking} connectivity`);
  }

  if (parseInt(motherboard.usb32Gen2Headers) > 0) {
    reasons.push(`High-speed USB 3.2 Gen 2 support for fast data transfer`);
  }

  return reasons.filter(reason => reason.length > 0);
};

export async function POST(req: Request) {
  try {
    const { 
      budget, 
      cpuBrand, 
      selectedCPU,
      page = 1, 
      itemsPerPage = 10, 
      searchTerm = "" 
    }: RequestPayload = await req.json();

    debugLog('Request Parameters', { budget, cpuBrand, selectedCPU, page, itemsPerPage, searchTerm });

    const tierInfo = getMotherboardBudgetTier(budget);
    debugLog('Budget Tier Info', tierInfo);

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    const compatibleSockets = getCompatibleSockets(cpuBrand, selectedCPU);
    const searchString = `
      motherboard components with:
      price range $${tierInfo.priceRange.min.toFixed(0)} to $${tierInfo.priceRange.max.toFixed(0)}
      socket: ${compatibleSockets.join(', ')}
      ${selectedCPU ? `TDP support: ${selectedCPU.specifications.tdp}W` : ''}
      ${selectedCPU?.specifications?.memoryType ? `memory: ${selectedCPU.specifications.memoryType}` : ''}
      features: ${tierInfo.features.join(', ')}
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    const searchResults = await vectorStore.similaritySearch(searchString, 50);
    debugLog('Initial Results Count', searchResults.length);

    const motherboards = searchResults
      .map(result => {
        const data = parseMotherboardData(result.pageContent);
        if (!data.Name || !data.Price) return null;

        const price = parseFloat(data.Price.replace(/[$,]/g, ''));
        if (isNaN(price) || price === 0) return null;

        const motherboard = {
          id: `mb-${data.Name.replace(/\s+/g, '-').toLowerCase()}`,
          name: data.Name,
          price,
          image: data['Image URL'] || '',
          manufacturer: data.Manufacturer || 'Unknown',
          socket: data['Socket/CPU'] || 'Unknown',
          formFactor: data['Form Factor'] || 'ATX',
          chipset: data.Chipset || 'Unknown',
          memoryMax: data['Memory Max'] || 'Unknown',
          memoryType: data['Memory Type'] || 'Unknown',
          memorySlots: data['Memory Slots'] || '0',
          m2Slots: data['M.2 Slots'] || '0',
          wirelessNetworking: data['Wireless Networking'] || 'None',
          pciSlots: data['PCIe x16 Slots'] || '0',
          sataSlots: data['SATA 6.0 Gb/s'] || '0',
          usb32Gen2Headers: data['USB 3.2 Gen 2 Headers'] || '0',
          usb32Gen1Headers: data['USB 3.2 Gen 1 Headers'] || '0',
          specifications: data['Specifications'] || ''
        };

        const score = calculateCompatibilityScore(
          motherboard, 
          cpuBrand, 
          selectedCPU, 
          tierInfo
        );
        
        return {
          ...motherboard,
          score,
          isRecommended: score >= 80,
          reasons: generateRecommendationReasons(
            motherboard, 
            score, 
            selectedCPU, 
            tierInfo
          )
        };
      })
      .filter((mb): mb is NonNullable<typeof mb> => 
        mb !== null && 
        mb.price >= tierInfo.priceRange.min * 0.8 && 
        mb.price <= tierInfo.priceRange.max * 1.2
      )
      .sort((a, b) => b.score - a.score);

    debugLog('Processed Motherboards Count', motherboards.length);

    if (motherboards.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible motherboards found',
        details: 'Try adjusting your search criteria or budget range',
        searchCriteria: {
          priceRange: tierInfo.priceRange,
          cpuBrand,
          compatibleSockets,
          recommendedFeatures: tierInfo.features
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const startIndex = (page - 1) * itemsPerPage;
    const paginatedMotherboards = motherboards.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      motherboards: paginatedMotherboards,
      totalCount: motherboards.length,
      page,
      itemsPerPage,
      searchCriteria: {
        priceRange: tierInfo.priceRange,
        mustHaveFeatures: tierInfo.features,
        recommendedSockets: compatibleSockets,
        recommendedFormFactors: ['ATX', 'Micro ATX']
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.motherboards.length
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
      error: 'Failed to process motherboard recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}