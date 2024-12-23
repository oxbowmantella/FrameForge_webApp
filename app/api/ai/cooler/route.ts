import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

// Debug logging utility
const debugLog = (step: string, data: any) => {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

// Types
interface CoolingRequirements {
  tdpRequired: number;
  maxHeight: number;
  socketType: string;
  recommendedType: 'Air' | 'Liquid';
  noisePreference: 'Silent' | 'Balanced' | 'Performance';
  stockCoolerAssessment: {
    hasStockCooler: boolean;
    isStockSufficient: boolean;
    recommendationType: 'Critical' | 'Beneficial' | 'Optional';
    reason: string;
  };
}

// Helper function to parse content
const parsePageContent = (content: string) => {
  const lines = content.split('\n');
  const result: { [key: string]: string } = {};
  
  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      result[key.trim()] = valueParts.join(':').trim();
    }
  });
  
  return result;
};

// Assess stock cooler adequacy
const assessStockCooler = (cpuTDP: number, hasStockCooler: boolean): {
  isStockSufficient: boolean;
  recommendationType: 'Critical' | 'Beneficial' | 'Optional';
  reason: string;
} => {
  if (!hasStockCooler) {
    return {
      isStockSufficient: false,
      recommendationType: 'Critical',
      reason: 'CPU does not include a stock cooler - aftermarket cooling required'
    };
  }

  if (cpuTDP > 125) {
    return {
      isStockSufficient: false,
      recommendationType: 'Critical',
      reason: 'Stock cooler inadequate for high-TDP processor - thermal throttling likely'
    };
  }

  if (cpuTDP > 95) {
    return {
      isStockSufficient: false,
      recommendationType: 'Beneficial',
      reason: 'Stock cooler may limit sustained performance - upgrade recommended for better thermal headroom'
    };
  }

  if (cpuTDP > 65) {
    return {
      isStockSufficient: true,
      recommendationType: 'Beneficial',
      reason: 'Stock cooler is adequate but aftermarket cooling would provide better thermal performance and lower noise'
    };
  }

  return {
    isStockSufficient: true,
    recommendationType: 'Optional',
    reason: 'Stock cooler is sufficient for this CPU - consider upgrade only for lower noise or aesthetics'
  };
};

// Calculate detailed cooling requirements
const calculateCoolingRequirements = (components: any): CoolingRequirements => {
  const requirements: CoolingRequirements = {
    tdpRequired: 65,
    maxHeight: 170,
    socketType: '',
    recommendedType: 'Air',
    noisePreference: 'Balanced',
    stockCoolerAssessment: {
      hasStockCooler: false,
      isStockSufficient: false,
      recommendationType: 'Critical',
      reason: ''
    }
  };

  if (components.cpu?.specifications) {
    const cpuSpecs = components.cpu.specifications;
    requirements.socketType = cpuSpecs.socket || '';
    const tdp = parseInt(cpuSpecs.tdp) || 65;
    
    // Add overhead for thermal headroom
    requirements.tdpRequired = Math.ceil(tdp * 1.2);

    // Assess stock cooler situation
    const hasStockCooler = cpuSpecs.includesCooler || false;
    const stockAssessment = assessStockCooler(tdp, hasStockCooler);
    requirements.stockCoolerAssessment = {
      hasStockCooler,
      ...stockAssessment
    };

    // Determine cooling recommendations based on TDP
    if (tdp >= 125) {
      requirements.recommendedType = 'Liquid';
      requirements.noisePreference = 'Performance';
    } else if (tdp >= 95) {
      requirements.recommendedType = 'Air';
      requirements.noisePreference = 'Performance';
    } else {
      requirements.recommendedType = 'Air';
      requirements.noisePreference = 'Balanced';
    }
  }

  // Adjust max height based on case
  if (components.case?.specifications?.dimensions) {
    const caseWidth = parseInt(components.case.specifications.dimensions.width) || 200;
    requirements.maxHeight = Math.floor(caseWidth - 30);
  }

  return requirements;
};

// Calculate performance improvement over stock
const calculatePerformanceImprovement = (
  coolerTDP: number,
  cpuTDP: number,
  isLiquid: boolean
): number => {
  let improvement = ((coolerTDP - cpuTDP) / cpuTDP) * 50; // Base improvement
  
  // Additional points for liquid cooling
  if (isLiquid) {
    improvement += 20;
  }
  
  // Cap improvement score
  return Math.min(Math.max(improvement, 0), 100);
};

// Generate recommendation reasons
const generateRecommendationReasons = (
  cooler: any,
  requirements: CoolingRequirements,
  performanceImprovement: number
): string[] => {
  const reasons: string[] = [];

  // Socket compatibility
  reasons.push(`Compatible with ${requirements.socketType} socket`);

  // Cooling capacity
  if (cooler.type === 'Liquid') {
    reasons.push('Liquid cooling provides maximum thermal performance');
  } else {
    reasons.push(`Air cooling solution with ${cooler.performance.tdpRating} capacity`);
  }

  // Performance improvement
  if (requirements.stockCoolerAssessment.hasStockCooler) {
    if (performanceImprovement >= 50) {
      reasons.push('Significant thermal performance improvement over stock cooler');
    } else if (performanceImprovement >= 25) {
      reasons.push('Moderate thermal performance improvement over stock cooler');
    }
  }

  // Noise levels
  if (cooler.noiseLevel) {
    reasons.push(`${cooler.noiseLevel}dB noise level - ${
      cooler.noiseLevel < 25 ? 'virtually silent' :
      cooler.noiseLevel < 30 ? 'very quiet' :
      cooler.noiseLevel < 35 ? 'quiet' : 'moderate'
    } operation`);
  }

  // Case compatibility
  if (cooler.height) {
    reasons.push(`${cooler.height}mm height - compatible with case clearance`);
  }

  return reasons;
};

export async function POST(req: Request) {
  try {
    const { budget, components, page = 1, itemsPerPage = 10, searchTerm = "" } = await req.json();
    debugLog('Request Parameters', { budget, components, page, itemsPerPage, searchTerm });

    // Calculate cooling requirements
    const coolingReq = calculateCoolingRequirements(components);
    debugLog('Cooling Requirements', coolingReq);

    // Calculate budget allocation
    const minBudget = coolingReq.stockCoolerAssessment.recommendationType === 'Critical' 
      ? budget * 0.07  // Allocate more for critical needs
      : budget * 0.05;
    const maxBudget = coolingReq.stockCoolerAssessment.recommendationType === 'Critical'
      ? budget * 0.12
      : budget * 0.10;

    // Initialize AI services
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

    // Construct search query
    const searchString = `
      CPU cooler with these characteristics:
      price range $${minBudget.toFixed(0)} to $${maxBudget.toFixed(0)}
      supports socket ${coolingReq.socketType}
      handles ${coolingReq.tdpRequired}W TDP or higher
      maximum height ${coolingReq.maxHeight}mm
      ${coolingReq.recommendedType === 'Liquid' ? 'prefer liquid cooling' : 'air or liquid cooling'}
      ${coolingReq.noisePreference === 'Silent' ? 'focus on quiet operation' :
        coolingReq.noisePreference === 'Performance' ? 'focus on cooling performance' :
        'balance noise and performance'}
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform search
    const searchResults = await vectorStore.similaritySearch(searchString, 50);
    debugLog('Initial Results Count', searchResults.length);

    // Process results
    const coolers = searchResults
      .map(result => {
        const data = parsePageContent(result.pageContent);
        if (!data.Name || !data.Price) return null;

        const price = parseFloat(data.Price.replace(/[$,]/g, ''));
        if (isNaN(price) || price === 0) return null;

        // Parse specifications
        const height = parseInt(data.Height) || 0;
        const tdpRating = parseInt(data['TDP Rating']) || coolingReq.tdpRequired;
        const noiseLevel = parseFloat(data['Noise Level']) || 0;
        const isWaterCooled = data['Water Cooled']?.toLowerCase() === 'yes';

        // Skip if incompatible
        if (height > coolingReq.maxHeight) return null;
        if (tdpRating < coolingReq.tdpRequired) return null;

        // Check socket compatibility
        const sockets = (data['CPU Socket'] || '').split(',');
        if (!sockets.some(s => s.trim().toLowerCase().includes(coolingReq.socketType.toLowerCase()))) {
          return null;
        }

        // Calculate performance improvement
        const perfImprovement = calculatePerformanceImprovement(
          tdpRating,
          coolingReq.tdpRequired,
          isWaterCooled
        );

        const cooler = {
          id: `cooler-${data.Name.replace(/\s+/g, '-').toLowerCase()}`,
          name: data.Name,
          manufacturer: data.Manufacturer || 'Unknown',
          price,
          image: data['Image URL'] || '',
          type: isWaterCooled ? 'Liquid' : 'Air',
          socket: data['CPU Socket'] || 'Unknown',
          height,
          noiseLevel,
          fanRPM: data['Fan RPM'] || 'N/A',
          performance: {
            tdpRating,
            perfImprovement,
            noiseLevel: noiseLevel ? `${noiseLevel}dB` : 'Unknown',
          },
          compatibility: {
            socketOk: true,
            heightOk: true,
            tdpOk: true
          },
          score: perfImprovement * 0.7 + (isWaterCooled ? 30 : 0),
          isRecommended: false,
          reasons: generateRecommendationReasons(
            { type: isWaterCooled ? 'Liquid' : 'Air', performance: { tdpRating }, noiseLevel, height },
            coolingReq,
            perfImprovement
          )
        };

        return cooler;
      })
      .filter((cooler): cooler is NonNullable<typeof cooler> => 
        cooler !== null && 
        cooler.price >= minBudget * 0.8 && 
        cooler.price <= maxBudget * 1.2
      )
      .sort((a, b) => b.score - a.score);

    // Mark top recommendations
    coolers.slice(0, 3).forEach(cooler => {
      cooler.isRecommended = true;
    });

    debugLog('Processed Results Count', coolers.length);

    // Handle no results
    if (coolers.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible CPU coolers found',
        details: 'Try adjusting your search criteria or budget range',
        requirements: coolingReq
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedCoolers = coolers.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      coolers: paginatedCoolers,
      totalCount: coolers.length,
      page,
      itemsPerPage,
      requirements: coolingReq,
      searchCriteria: {
        priceRange: { min: minBudget, max: maxBudget },
        socketType: coolingReq.socketType,
        maxHeight: coolingReq.maxHeight,
        tdpRequired: coolingReq.tdpRequired,
        recommendedType: coolingReq.recommendedType,
        stockCoolerAssessment: coolingReq.stockCoolerAssessment
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.coolers.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process cooler recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}