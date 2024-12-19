// /app/api/ai/motherboards/route.ts
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
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "" } = await req.json();
    debugLog('Request Parameters', { budget, page, itemsPerPage, searchTerm });

    // Initialize our AI and vector store
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index
    });

    // Create search string
    const searchString = `
      motherboard components with these characteristics:
      price range $${budget * 0.05} to $${budget * 0.15}
      modern sockets like AM4 AM5 LGA1700
      high-end features chipsets memory support
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const motherboards = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed Motherboard ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid motherboard data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        return {
          id: `mb-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          socket: parsedContent['Socket/CPU'] || 'Unknown',
          formFactor: parsedContent['Form Factor'] || 'ATX',
          chipset: parsedContent.Chipset || 'Unknown',
          memoryMax: parsedContent['Memory Max'] || 'Unknown',
          memoryType: parsedContent['Memory Type'] || 'Unknown',
          memorySlots: parsedContent['Memory Slots'] || '0',
          m2Slots: parsedContent['M.2 Slots'] || '0',
          wirelessNetworking: parsedContent['Wireless Networking'] || 'None',
          pciSlots: parsedContent['PCIe x16 Slots'] || '0',
          sataSlots: parsedContent['SATA 6.0 Gb/s'] || '0',
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          reasons: [
            `Compatible with ${parsedContent['Socket/CPU'] || 'modern'} processors`,
            parsedContent.Chipset ? `Features ${parsedContent.Chipset} chipset` : null,
            parsedContent['Memory Type'] ? `Supports ${parsedContent['Memory Type']}` : null,
            parsedContent['Wireless Networking'] ? `Includes ${parsedContent['Wireless Networking']}` : null
          ].filter(Boolean)
        };
      })
      .filter((mb): mb is NonNullable<typeof mb> => mb !== null)
      .sort((a, b) => a.price - b.price);

    debugLog('Processed Motherboards Sample', motherboards.slice(0, 2));

    // Handle no results case
    if (motherboards.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No motherboards found matching your criteria',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedMotherboards = motherboards.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      motherboards: paginatedMotherboards,
      totalCount: motherboards.length,
      page,
      itemsPerPage,
      searchTerm,
      budget
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.motherboards.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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