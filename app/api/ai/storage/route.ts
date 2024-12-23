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

// Calculate storage requirements based on budget
const calculateStorageRequirements = (budget: number) => {
  // More flexible budget allocation
  const remainingBudgetPercentage = 0.20; // Can use up to 20% of total budget
  const maxBudget = budget * remainingBudgetPercentage;

  // Define storage tiers based on total system budget
  if (budget <= 1000) {
    return {
      minStorage: 500, // Minimum 500GB
      recommendedStorage: 1000, // Recommend 1TB
      maxBudget,
      priorities: {
        nvme: 'preferred',
        minSpeed: 2000, // MB/s
        recommendedSpeed: 3500
      }
    };
  } else if (budget <= 2000) {
    return {
      minStorage: 1000, // Minimum 1TB
      recommendedStorage: 2000, // Recommend 2TB
      maxBudget,
      priorities: {
        nvme: 'required',
        minSpeed: 3000,
        recommendedSpeed: 5000
      }
    };
  } else {
    return {
      minStorage: 2000, // Minimum 2TB
      recommendedStorage: 4000, // Recommend 4TB
      maxBudget,
      priorities: {
        nvme: 'required',
        minSpeed: 5000,
        recommendedSpeed: 7000
      }
    };
  }
};

// Generate detailed recommendations based on storage specs
const generateStorageRecommendation = (
  storage: any,
  requirements: ReturnType<typeof calculateStorageRequirements>
) => {
  const reasons: string[] = [];
  let performanceScore = 0;
  
  // Extract capacity in GB for comparison
  const capacityGB = parseInt(storage.capacity?.replace(/[^\d]/g, '') || '0');
  const isNVMe = storage.isNVMe || storage.interface?.toLowerCase().includes('nvme');
  const isSSD = storage.type?.toLowerCase().includes('ssd');
  
  // Capacity assessment
  if (capacityGB >= requirements.recommendedStorage) {
    reasons.push(`High capacity of ${storage.capacity} provides ample space for large game libraries, media collections, and professional workloads`);
    performanceScore += 30;
  } else if (capacityGB >= requirements.minStorage) {
    reasons.push(`${storage.capacity} offers good storage space for mixed use including gaming and content creation`);
    performanceScore += 20;
  } else {
    reasons.push(`${storage.capacity} provides basic storage for OS and essential applications`);
    performanceScore += 10;
  }

  // Performance technology assessment
  if (isNVMe) {
    reasons.push(`NVMe technology enables ultra-fast data transfers, perfect for quick game loading and file operations`);
    performanceScore += 30;
  } else if (isSSD) {
    reasons.push(`SSD technology ensures responsive system performance and faster load times compared to traditional HDDs`);
    performanceScore += 20;
  } else {
    reasons.push(`Traditional HDD offering high capacity at a budget-friendly price point`);
    performanceScore += 10;
  }

  // Interface and form factor benefits
  if (storage.interface?.toLowerCase().includes('pcie 4.0')) {
    reasons.push(`PCIe 4.0 interface enables maximum throughput for demanding workloads like 4K video editing`);
    performanceScore += 20;
  } else if (storage.interface?.toLowerCase().includes('pcie 3.0')) {
    reasons.push(`PCIe 3.0 interface provides strong performance for gaming and content creation`);
    performanceScore += 15;
  }

  // Cache consideration
  if (storage.cache && storage.cache !== 'Unknown') {
    const cacheSize = parseInt(storage.cache);
    if (cacheSize >= 1024) {
      reasons.push(`Large ${storage.cache} cache enhances sustained performance during heavy file transfers`);
      performanceScore += 20;
    } else if (cacheSize > 0) {
      reasons.push(`${storage.cache} cache helps maintain consistent performance during regular use`);
      performanceScore += 15;
    }
  }

  // Value proposition
  if (storage.pricePerGB) {
    const pricePerGB = parseFloat(storage.pricePerGB.replace(/[^0-9.]/g, ''));
    if (pricePerGB < 0.08) {
      reasons.push(`Excellent price-to-capacity ratio at ${storage.pricePerGB}/GB`);
      performanceScore += 10;
    } else if (pricePerGB < 0.12) {
      reasons.push(`Competitive price-to-capacity ratio at ${storage.pricePerGB}/GB`);
      performanceScore += 7;
    }
  }

  return {
    isRecommended: performanceScore >= 70,
    summary: `${isNVMe ? 'High-performance NVMe' : isSSD ? 'Reliable SSD' : 'High-capacity HDD'} storage solution with ${storage.capacity} capacity`,
    reasons: reasons.filter(Boolean),
    performanceScore: Math.min(100, performanceScore)
  };
};

export async function POST(req: Request) {
  try {
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", motherboard } = await req.json();
    debugLog('Request Parameters', { budget, page, itemsPerPage, searchTerm, motherboard });

    const requirements = calculateStorageRequirements(budget);
    debugLog('Storage Requirements', requirements);

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

    // Create search string with compatibility requirements
    const searchString = `
      storage devices with these characteristics:
      maximum budget $${requirements.maxBudget}
      minimum capacity ${requirements.minStorage}GB
      ${requirements.priorities.nvme === 'required' ? 'must be NVMe' : 'prefer NVMe'}
      minimum speed ${requirements.priorities.minSpeed}MB/s
      ${hasM2Slots ? 'include M.2 NVMe SSDs' : ''}
      ${hasSataSlots ? 'include SATA SSDs and HDDs' : ''}
      prioritize performance and reliability
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    const searchResults = await vectorStore.similaritySearch(searchString, 50);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const storageDevices = searchResults
      .map((result) => {
        const parsedContent = parsePageContent(result.pageContent);
        if (!parsedContent.Name || !parsedContent.Price) return null;

        const price = parseFloat(parsedContent.Price.replace(/[$,]/g, ''));
        if (isNaN(price) || price === 0 || price > requirements.maxBudget) return null;

        // Check compatibility with motherboard
        const isM2 = parsedContent['Form Factor']?.includes('M.2');
        const isSATA = parsedContent['Interface']?.includes('SATA');
        
        if (isM2 && !hasM2Slots) return null;
        if (isSATA && !hasSataSlots) return null;

        const device = {
          id: `storage-${parsedContent.Name.replace(/[^a-zA-Z0-9]/g, '-')}`,
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
          isNVMe: parsedContent.NVME === 'Yes'
        };

        // Generate detailed recommendation
        const recommendation = generateStorageRecommendation(device, requirements);
        
        return {
          ...device,
          ...recommendation
        };
      })
      .filter((storage): storage is NonNullable<typeof storage> => storage !== null)
      .sort((a, b) => b.performanceScore - a.performanceScore);

    debugLog('Processed Storage Devices', storageDevices.length);

    if (storageDevices.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible storage devices found',
        details: 'Try adjusting your search terms or budget range',
        requirements
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
      searchCriteria: {
        priceRange: {
          max: requirements.maxBudget
        },
        supportedInterfaces: {
          m2: hasM2Slots,
          sata: hasSataSlots
        },
        requirements
      }
    };

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
      error: 'Failed to process storage recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}