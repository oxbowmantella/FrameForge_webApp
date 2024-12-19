// /app/api/ai/cpu/route.ts
import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

const debugLog = (step: string, data: any) => {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

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
    const { budget, motherboard, page = 1, itemsPerPage = 10, searchTerm = "" } = await req.json();
    debugLog('Request Parameters', { budget, motherboard, page, itemsPerPage, searchTerm });

    // Initialize AI and vector store
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index
    });

    // Calculate CPU budget range (typically 15-25% of total budget)
    const minCpuBudget = budget * 0.15;
    const maxCpuBudget = budget * 0.25;

    // Create search string considering motherboard compatibility
    const searchString = `
      CPU components with these characteristics:
      price range $${minCpuBudget} to $${maxCpuBudget}
      socket type ${motherboard?.specifications?.socket || 'modern sockets'}
      high performance characteristics
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const cpus = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed CPU ${index}`, parsedContent);

        // Skip invalid entries
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid CPU data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check socket compatibility if motherboard is selected
        if (motherboard && motherboard.specifications.socket) {
          const cpuSocket = parsedContent.Socket;
          if (!cpuSocket?.includes(motherboard.specifications.socket)) {
            return null;
          }
        }

        return {
          id: `cpu-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          socket: parsedContent.Socket || 'Unknown',
          series: parsedContent.Series || 'Unknown',
          coreCount: parsedContent['Core Count'] || 'Unknown',
          coreClock: parsedContent['Performance Core Clock'] || parsedContent['Core Clock'] || 'Unknown',
          boostClock: parsedContent['Performance Core Boost Clock'] || parsedContent['Boost Clock'] || 'Unknown',
          tdp: parsedContent.TDP || 'Unknown',
          integratedGraphics: parsedContent['Integrated Graphics'] || 'None',
          cache: {
            l2: parsedContent['L2 Cache'] || 'Unknown',
            l3: parsedContent['L3 Cache'] || 'Unknown'
          },
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          reasons: [
            `Socket ${parsedContent.Socket} compatible with selected motherboard`,
            parsedContent['Core Count'] ? `${parsedContent['Core Count']} cores for enhanced performance` : null,
            parsedContent['Integrated Graphics'] ? `Includes ${parsedContent['Integrated Graphics']} integrated graphics` : null,
            parsedContent.TDP ? `${parsedContent.TDP} TDP for power efficiency` : null
          ].filter(Boolean)
        };
      })
      .filter((cpu): cpu is NonNullable<typeof cpu> => cpu !== null)
      .sort((a, b) => a.price - b.price);

    debugLog('Processed CPUs Sample', cpus.slice(0, 2));

    // Handle no results case
    if (cpus.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No CPUs found matching your criteria',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedCPUs = cpus.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      cpus: paginatedCPUs,
      totalCount: cpus.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      searchCriteria: {
        priceRange: {
          min: minCpuBudget,
          max: maxCpuBudget
        },
        socket: motherboard?.specifications?.socket,
        recommendedFeatures: [
          'High core count',
          'Latest generation',
          'Power efficient'
        ]
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.cpus.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process CPU recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}