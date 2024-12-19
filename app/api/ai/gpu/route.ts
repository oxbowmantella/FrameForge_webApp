// /app/api/ai/gpu/route.ts
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

// Helper to calculate estimated system power
const calculateSystemPower = (components: any) => {
  let basePower = 100; // Base system power draw
  
  if (components.cpu?.specifications?.tdp) {
    basePower += parseInt(components.cpu.specifications.tdp);
  } else {
    basePower += 125; // Default CPU power estimate
  }

  // Add power for other components
  basePower += 50; // Memory + Storage
  basePower += 30; // Motherboard
  basePower += 20; // Fans

  return basePower;
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

    // Get compatibility constraints
    const maxGpuLength = components.case?.specifications?.maxGpuLength || 400;
    const availablePower = components.psu?.specifications?.wattage || 850;
    const systemPower = calculateSystemPower(components);
    const remainingPower = availablePower - systemPower;
    
    // Calculate budget allocation (typically 30-40% of total budget for GPU)
    const minBudget = budget * 0.25;
    const maxBudget = budget * 0.40;

    // Create search string with compatibility requirements
    const searchString = `
      graphics cards with these characteristics:
      price range $${minBudget} to $${maxBudget}
      maximum length ${maxGpuLength}mm
      maximum power consumption ${remainingPower}W
      modern gaming performance
      reliable manufacturers
      good value for money
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const gpus = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed GPU ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid GPU data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check physical compatibility
        const gpuLength = parseInt(parsedContent.Length) || 0;
        if (gpuLength > maxGpuLength) {
          return null;
        }

        // Check power compatibility
        const tdp = parseInt(parsedContent.TDP) || 0;
        if (tdp > remainingPower) {
          return null;
        }

        return {
          id: `gpu-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          chipset: parsedContent.Chipset || 'Unknown',
          memory: parsedContent.Memory || 'Unknown',
          memoryType: parsedContent['Memory Type'] || 'Unknown',
          coreClock: parsedContent['Core Clock'] || 'Unknown',
          boostClock: parsedContent['Boost Clock'] || 'Unknown',
          length: parsedContent.Length || 'Unknown',
          tdp: parsedContent.TDP || 'Unknown',
          powerConnectors: parsedContent['External Power'] || 'Unknown',
          outputs: {
            hdmi: parsedContent['HDMI Outputs'] || '0',
            displayPort: parsedContent['DisplayPort Outputs'] || '0',
          },
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          compatibility: {
            powerOk: true,
            lengthOk: true,
            tdpOk: true
          },
          reasons: [
            `Fits in your ${components.case?.name || 'case'} (${gpuLength}mm)`,
            `Compatible with your ${components.psu?.name || 'power supply'}`,
            parsedContent.Chipset ? `${parsedContent.Chipset} for excellent performance` : null,
            parsedContent.Memory ? `${parsedContent.Memory} ${parsedContent['Memory Type']} memory` : null
          ].filter(Boolean)
        };
      })
      .filter((gpu): gpu is NonNullable<typeof gpu> => gpu !== null)
      .sort((a, b) => b.score - a.score);

    debugLog('Processed GPUs Sample', gpus.slice(0, 2));

    // Handle no results case
    if (gpus.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible GPUs found',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedGpus = gpus.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      gpus: paginatedGpus,
      totalCount: gpus.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      systemInfo: {
        availablePower: remainingPower,
        maxLength: maxGpuLength,
        totalBudget: budget,
        allocatedBudget: {
          min: minBudget,
          max: maxBudget
        }
      },
      searchCriteria: {
        priceRange: {
          min: minBudget,
          max: maxBudget
        },
        powerLimit: remainingPower,
        lengthLimit: maxGpuLength,
        features: ['DLSS', 'Ray Tracing', 'High Refresh Rate']
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.gpus.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process GPU recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}