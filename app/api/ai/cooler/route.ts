// /app/api/ai/cooler/route.ts
import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

const debugLog = (step: string, data: any) => {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

// Helper function to parse the pageContent string into an object
const parsePageContent = (content: string) => {
  const lines = content.split('\n');
  const result: { [key: string]: string } = {};
  
  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      result[key.trim()] = valueParts.join(':').trim();
    }
  });
  
  debugLog('Parsed Content', result);
  return result;
};

// Calculate cooling requirements
const calculateCoolingRequirements = (components: any) => {
  const requirements = {
    tdpRequired: 65, // Default minimum TDP handling
    maxHeight: 170, // Default maximum cooler height
    socketType: '', // CPU socket
    recommendedType: 'Air', // Default cooling type
    noisePreference: 'Balanced', // Default noise preference
  };

  // Set CPU Socket and TDP requirements
  if (components.cpu?.specifications) {
    const cpuSpecs = components.cpu.specifications;
    requirements.socketType = cpuSpecs.socket || '';
    const tdp = parseInt(cpuSpecs.tdp) || 65;
    
    // Add 20% overhead for overclocking headroom
    requirements.tdpRequired = Math.ceil(tdp * 1.2);

    // Recommend liquid cooling for high TDP CPUs
    if (tdp >= 125) {
      requirements.recommendedType = 'Liquid';
      requirements.noisePreference = 'Performance';
    }
  }

  // Adjust max height based on case
  if (components.case?.specifications?.dimensions) {
    const caseWidth = components.case.specifications.dimensions.width;
    // Assume CPU cooler needs ~30mm less than case width
    requirements.maxHeight = Math.floor(caseWidth - 30);
  }

  return requirements;
};

export async function POST(req: Request) {
  try {
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", components } = await req.json();
    debugLog('Request Parameters', { budget, page, itemsPerPage, searchTerm, components });

    // Initialize our AI and vector store
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index
    });

    // Calculate cooling requirements
    const coolingReq = calculateCoolingRequirements(components);
    
    // Calculate budget allocation (typically 5-10% of total budget for cooler)
    const minBudget = budget * 0.05;
    const maxBudget = budget * 0.10;

    // Create search string with requirements
    const searchString = `
      CPU cooler with these characteristics:
      price range $${minBudget} to $${maxBudget}
      supports socket ${coolingReq.socketType}
      handles ${coolingReq.tdpRequired}W TDP
      maximum height ${coolingReq.maxHeight}mm
      ${coolingReq.recommendedType === 'Liquid' ? 'prefer liquid cooling' : 'air or liquid cooling'}
      ${coolingReq.noisePreference === 'Performance' ? 'focus on cooling performance' : 'balance noise and performance'}
      reliable brand
      good value
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const coolers = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed Cooler ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid cooler data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check socket compatibility
        const sockets = (parsedContent['CPU Socket'] || '').split(',');
        if (!sockets.some(s => 
          s.trim().toLowerCase().includes(coolingReq.socketType.toLowerCase()))) {
          return null;
        }

        // Check height compatibility
        const height = parseInt(parsedContent.Height) || 0;
        if (height > coolingReq.maxHeight) {
          return null;
        }

        // Get cooling performance metrics
        const fanRPM = parsedContent['Fan RPM'] || 'N/A';
        const noiseLevel = parseFloat(parsedContent['Noise Level']) || 0;
        const isWaterCooled = parsedContent['Water Cooled'] === 'Yes';

        return {
          id: `cooler-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          height: height,
          fanRPM: fanRPM,
          noiseLevel: noiseLevel,
          isWaterCooled: isWaterCooled,
          socket: parsedContent['CPU Socket'] || 'Unknown',
          color: parsedContent.Color || 'Black',
          type: isWaterCooled ? 'Liquid' : 'Air',
          performance: {
            tdpRating: parsedContent['TDP Rating'] || `${coolingReq.tdpRequired}W+`,
            noiseLevel: parsedContent['Noise Level'] || 'Unknown',
            airflow: parsedContent['Airflow'] || 'Unknown'
          },
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          compatibility: {
            socketOk: true,
            heightOk: true,
            tdpOk: parseInt(parsedContent['TDP Rating']) >= coolingReq.tdpRequired
          },
          reasons: [
            `Compatible with ${coolingReq.socketType}`,
            height ? `Fits within ${height}mm height limit` : null,
            isWaterCooled ? 'Liquid cooling for maximum performance' : 'Air cooling solution',
            noiseLevel ? `${noiseLevel}dB noise level` : null,
            `Suitable for ${coolingReq.tdpRequired}W TDP`
          ].filter(Boolean)
        };
      })
      .filter((cooler): cooler is NonNullable<typeof cooler> => cooler !== null)
      .sort((a, b) => {
        // Sort by cooling type preference first, then score
        if (a.type !== b.type) {
          return coolingReq.recommendedType === a.type ? -1 : 1;
        }
        return b.score - a.score;
      });

    debugLog('Processed Coolers Sample', coolers.slice(0, 2));

    // Handle no results case
    if (coolers.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible CPU coolers found',
        details: 'Try adjusting your search terms or budget range',
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
      searchTerm,
      budget,
      requirements: coolingReq,
      searchCriteria: {
        priceRange: {
          min: minBudget,
          max: maxBudget
        },
        socketType: coolingReq.socketType,
        maxHeight: coolingReq.maxHeight,
        tdpRequired: coolingReq.tdpRequired,
        recommendedType: coolingReq.recommendedType,
        noisePreference: coolingReq.noisePreference
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