// /app/api/ai/case/route.ts
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

// Calculate estimated space requirements
const calculateSpaceRequirements = (components: any) => {
  const requirements = {
    minGpuLength: 300, // Default minimum GPU clearance in mm
    minCpuCoolerHeight: 150, // Default minimum CPU cooler height in mm
    recommendedAirflow: 'Standard', // Default airflow requirement
    motherboardFormFactor: 'ATX', // Default form factor
    driveCount: 1, // Default drive count
  };

  // Adjust based on CPU TDP
  if (components.cpu?.specifications?.tdp) {
    const tdp = parseInt(components.cpu.specifications.tdp);
    if (tdp > 125) {
      requirements.recommendedAirflow = 'High';
    } else if (tdp > 95) {
      requirements.recommendedAirflow = 'Good';
    }
  }

  // Set motherboard form factor
  if (components.motherboard?.specifications?.formFactor) {
    requirements.motherboardFormFactor = components.motherboard.specifications.formFactor;
  }

  // Calculate drive requirements
  if (components.storage) {
    requirements.driveCount = Array.isArray(components.storage) ? 
      components.storage.length : 
      1;
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

    // Calculate space requirements
    const spaceReq = calculateSpaceRequirements(components);
    
    // Calculate budget allocation (typically 5-10% of total budget for case)
    const minBudget = budget * 0.05;
    const maxBudget = budget * 0.10;

    // Create search string with requirements
    const searchString = `
      computer case with these characteristics:
      price range $${minBudget} to $${maxBudget}
      supports ${spaceReq.motherboardFormFactor} motherboard
      good airflow for ${spaceReq.recommendedAirflow} cooling needs
      minimum ${spaceReq.minGpuLength}mm GPU clearance
      minimum ${spaceReq.minCpuCoolerHeight}mm CPU cooler height
      at least ${spaceReq.driveCount} drive bays
      modern design
      good build quality
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const cases = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed Case ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid case data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check motherboard compatibility
        const supportedFormFactors = (parsedContent['Motherboard Form Factor'] || '').split(',');
        if (!supportedFormFactors.some(ff => 
          ff.trim().toLowerCase() === spaceReq.motherboardFormFactor.toLowerCase())) {
          return null;
        }

        // Parse dimensions
        const maxGpuLength = parseInt(parsedContent['Maximum Video Card Length'] || '0');
        const dimensions = (parsedContent['Dimensions'] || '').split('x').map(d => parseInt(d));

        return {
          id: `case-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          type: parsedContent.Type || 'ATX Mid Tower',
          color: parsedContent.Color || 'Black',
          dimensions: {
            length: dimensions[0] || 0,
            width: dimensions[1] || 0,
            height: dimensions[2] || 0
          },
          maxGpuLength: maxGpuLength,
          formFactors: supportedFormFactors,
          driveBays: {
            internal35: parsedContent['Drive Bays']?.match(/(\d+)\s*x\s*Internal\s*3\.5/i)?.[1] || '0',
            internal25: parsedContent['Drive Bays']?.match(/(\d+)\s*x\s*Internal\s*2\.5/i)?.[1] || '0'
          },
          frontPorts: parsedContent['Front Panel USB'] || 'Unknown',
          hasUSBC: parsedContent['HasUSBC'] === 'Yes',
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          compatibility: {
            motherboardOk: true,
            gpuClearanceOk: maxGpuLength >= spaceReq.minGpuLength,
            driveSpaceOk: true,
            airflowRating: spaceReq.recommendedAirflow === 'High' ? 
              (parsedContent['Airflow Rating'] || 'Good') : 
              'Sufficient'
          },
          reasons: [
            `Supports ${spaceReq.motherboardFormFactor} motherboard`,
            maxGpuLength ? `Fits GPUs up to ${maxGpuLength}mm` : null,
            parsedContent['HasUSBC'] === 'Yes' ? 'Includes USB-C port' : null,
            `Good airflow for ${spaceReq.recommendedAirflow} cooling needs`
          ].filter(Boolean)
        };
      })
      .filter((case_): case_ is NonNullable<typeof case_> => case_ !== null)
      .sort((a, b) => {
        // Sort by compatibility score first, then price
        const scoreA = Object.values(a.compatibility).filter(v => v === true).length;
        const scoreB = Object.values(b.compatibility).filter(v => v === true).length;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.price - b.price;
      });

    debugLog('Processed Cases Sample', cases.slice(0, 2));

    // Handle no results case
    if (cases.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible cases found',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedCases = cases.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      cases: paginatedCases,
      totalCount: cases.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      requirements: spaceReq,
      searchCriteria: {
        priceRange: {
          min: minBudget,
          max: maxBudget
        },
        motherboardFormFactor: spaceReq.motherboardFormFactor,
        minimumClearances: {
          gpu: spaceReq.minGpuLength,
          cpuCooler: spaceReq.minCpuCoolerHeight
        },
        airflowRequirement: spaceReq.recommendedAirflow,
        features: ['USB-C', 'Good Airflow', 'Tool-less Design']
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.cases.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process case recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}