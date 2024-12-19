// /app/api/ai/storage/route.ts
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
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", motherboard } = await req.json();
    debugLog('Request Parameters', { budget, page, itemsPerPage, searchTerm, motherboard });

    // Initialize our AI and vector store
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index
    });

    // Get storage compatibility constraints from motherboard
    const hasM2Slots = motherboard?.specifications?.m2Slots || false;
    const hasSataSlots = motherboard?.specifications?.sataSlots || false;
    
    // Calculate budget allocation (typically 5-15% of total budget for storage)
    const minBudget = budget * 0.05;
    const maxBudget = budget * 0.15;

    // Create search string with compatibility requirements
    const searchString = `
      storage devices with these characteristics:
      price range $${minBudget} to $${maxBudget}
      ${hasM2Slots ? 'include M.2 NVMe SSDs' : ''}
      ${hasSataSlots ? 'include SATA SSDs and HDDs' : ''}
      good price per GB ratio
      reliable performance
      modern storage solutions
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const storageDevices = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed Storage ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid storage data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check compatibility with motherboard
        const isM2 = parsedContent['Form Factor']?.includes('M.2');
        const isSATA = parsedContent['Interface']?.includes('SATA');
        
        if (isM2 && !hasM2Slots) return null;
        if (isSATA && !hasSataSlots) return null;

        return {
          id: `storage-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          capacity: parsedContent.Capacity || 'Unknown',
          pricePerGB: parsedContent['Price / GB'] || 'Unknown',
          type: parsedContent.Type || 'Unknown',
          cache: parsedContent.Cache || 'Unknown',
          formFactor: parsedContent['Form Factor'] || 'Unknown',
          interface: parsedContent.Interface || 'Unknown',
          isNVMe: parsedContent.NVME === 'Yes',
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          reasons: [
            `Compatible with ${motherboard?.name || 'your system'}`,
            parsedContent.Type === 'SSD' ? 'Fast SSD storage' : 'High capacity HDD',
            parsedContent.NVME === 'Yes' ? 'NVMe for maximum speed' : null,
            parsedContent.Cache ? `${parsedContent.Cache} cache for better performance` : null
          ].filter(Boolean)
        };
      })
      .filter((storage): storage is NonNullable<typeof storage> => storage !== null)
      .sort((a, b) => {
        // Sort by type (SSDs first) and then by price
        if (a.type !== b.type) {
          return a.type === 'SSD' ? -1 : 1;
        }
        return a.price - b.price;
      });

    debugLog('Processed Storage Devices Sample', storageDevices.slice(0, 2));

    // Handle no results case
    if (storageDevices.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible storage devices found',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedStorage = storageDevices.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      storage: paginatedStorage,
      totalCount: storageDevices.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      searchCriteria: {
        priceRange: {
          min: minBudget,
          max: maxBudget
        },
        supportedInterfaces: {
          m2: hasM2Slots,
          sata: hasSataSlots
        },
        recommendedTypes: ['NVMe SSD', 'SATA SSD', 'HDD'],
        features: ['NVMe', 'Cache', 'High Capacity']
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.storage.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process storage recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}