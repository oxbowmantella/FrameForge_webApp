// /app/api/ai/memory/route.ts
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

export async function POST(req: Request) {
  try {
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", motherboard, cpu } = await req.json();
    debugLog('Request Parameters', { budget, page, itemsPerPage, searchTerm, motherboard, cpu });

    // Initialize our AI and vector store
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index
    });

    // Get memory type constraints from motherboard
    const memoryType = motherboard?.specifications?.memoryType || "";
    const maxMemory = motherboard?.specifications?.memoryMax || "";
    
    // Calculate budget allocation (typically 5-10% of total budget for memory)
    const minBudget = budget * 0.05;
    const maxBudget = budget * 0.10;

    // Create search string with compatibility requirements
    const searchString = `
      memory components with these characteristics:
      price range $${minBudget} to $${maxBudget}
      ${memoryType ? `memory type: ${memoryType}` : 'modern memory modules'}
      ${maxMemory ? `within maximum supported memory: ${maxMemory}` : ''}
      performance focused
      reliable brands
      good price to performance ratio
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const memoryModules = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed Memory ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid memory data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check compatibility with motherboard
        if (memoryType && parsedContent['Memory Type'] && 
            !parsedContent['Memory Type'].includes(memoryType)) {
          return null;
        }

        return {
          id: `mem-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          speed: parsedContent.Speed || 'Unknown',
          modules: parsedContent.Modules || 'Unknown',
          pricePerGB: parsedContent['Price / GB'] || 'Unknown',
          timing: parsedContent.Timing || 'Unknown',
          latency: parsedContent['CAS Latency'] || 'Unknown',
          voltage: parsedContent.Voltage || 'Unknown',
          heatSpreader: parsedContent['Heat Spreader'] === 'Yes',
          formFactor: parsedContent['Form Factor'] || 'Unknown',
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          reasons: [
            `Compatible with ${motherboard?.name || 'your system'}`,
            parsedContent.Speed ? `Fast ${parsedContent.Speed} speed` : null,
            parsedContent['CAS Latency'] ? `Good latency at CL${parsedContent['CAS Latency']}` : null,
            parsedContent['Heat Spreader'] === 'Yes' ? 'Includes heat spreader for better cooling' : null
          ].filter(Boolean)
        };
      })
      .filter((mem): mem is NonNullable<typeof mem> => mem !== null)
      .sort((a, b) => a.price - b.price);

    debugLog('Processed Memory Modules Sample', memoryModules.slice(0, 2));

    // Handle no results case
    if (memoryModules.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible memory modules found',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedMemory = memoryModules.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      memory: paginatedMemory,
      totalCount: memoryModules.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      searchCriteria: {
        priceRange: {
          min: minBudget,
          max: maxBudget
        },
        memoryType: memoryType || 'Any',
        maxMemory: maxMemory || 'Any',
        recommendedSpeeds: ['DDR4-3200', 'DDR4-3600', 'DDR5-4800', 'DDR5-5600'],
        features: ['Heat Spreader', 'XMP Support', 'Low Latency']
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.memory.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process memory recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}