// /app/api/ai/psu/route.ts
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

// Calculate total system power requirements
const calculateRequiredWattage = (components: any) => {
  let totalPower = 0;
  
  // Base system power (motherboard, fans, etc.)
  totalPower += 75;

  // CPU Power
  if (components.cpu?.specifications?.tdp) {
    totalPower += parseInt(components.cpu.specifications.tdp);
  } else {
    totalPower += 125; // Default CPU power estimate
  }

  // GPU Power
  if (components.gpu?.specifications?.tdp) {
    totalPower += parseInt(components.gpu.specifications.tdp);
  } else {
    totalPower += 250; // Default GPU power estimate
  }

  // Memory Power (typically 3W per stick)
  if (components.memory?.specifications?.modules) {
    const sticks = parseInt(components.memory.specifications.modules.split('x')[0]) || 2;
    totalPower += sticks * 3;
  } else {
    totalPower += 6; // Default 2 sticks
  }

  // Storage Power
  totalPower += 10; // HDD/SSD power estimate

  // Add 20% overhead for efficiency and future upgrades
  totalPower = Math.ceil(totalPower * 1.2);

  return totalPower;
};

// Determine required power connectors
const getRequiredConnectors = (components: any) => {
  const required = {
    eps: false,
    pcie8pin: 0,
    pcie6pin: 0,
    sata: 2, // Minimum for drives
    molex: 1  // Minimum for case fans
  };

  // CPU Power (EPS)
  if (components.cpu?.specifications?.tdp) {
    const tdp = parseInt(components.cpu.specifications.tdp);
    required.eps = tdp > 65; // Most modern CPUs need EPS
  }

  // GPU Power
  if (components.gpu?.specifications?.powerConnectors) {
    const connectors = components.gpu.specifications.powerConnectors;
    required.pcie8pin = (connectors.match(/8-pin/g) || []).length;
    required.pcie6pin = (connectors.match(/6-pin/g) || []).length;
  }

  return required;
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

    // Calculate system requirements
    const requiredWattage = calculateRequiredWattage(components);
    const requiredConnectors = getRequiredConnectors(components);
    
    // Calculate budget allocation (typically 10-15% of total budget for PSU)
    const minBudget = budget * 0.08;
    const maxBudget = budget * 0.15;

    // Create search string with requirements
    const searchString = `
      power supply with these characteristics:
      price range $${minBudget} to $${maxBudget}
      minimum wattage ${requiredWattage}W
      ${requiredConnectors.eps ? 'must have EPS connector' : ''}
      ${requiredConnectors.pcie8pin > 0 ? `needs ${requiredConnectors.pcie8pin} PCIe 8-pin connectors` : ''}
      ${requiredConnectors.pcie6pin > 0 ? `needs ${requiredConnectors.pcie6pin} PCIe 6-pin connectors` : ''}
      reliable brand
      good efficiency rating
      modular preferred
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    // Perform the search
    const searchResults = await vectorStore.similaritySearch(searchString, 20);
    debugLog('Search Results Count', searchResults.length);

    // Process and parse the results
    const powerSupplies = searchResults
      .map((result, index) => {
        const parsedContent = parsePageContent(result.pageContent);
        debugLog(`Parsed PSU ${index}`, parsedContent);

        // Only process if we have valid data
        if (!parsedContent.Name || !parsedContent.Price) {
          console.log('Skipping invalid PSU data:', parsedContent);
          return null;
        }

        const price = parseFloat(parsedContent.Price.replace('$', ''));
        if (isNaN(price) || price === 0) {
          return null;
        }

        // Check wattage compatibility
        const wattage = parseInt(parsedContent.Wattage) || 0;
        if (wattage < requiredWattage) {
          return null;
        }

        // Check connector compatibility
        const hasRequiredConnectors = 
          (!requiredConnectors.eps || parsedContent['EPS 8-Pin Connectors']) &&
          (requiredConnectors.pcie8pin <= parseInt(parsedContent['PCIe 8-Pin Connectors'] || '0')) &&
          (requiredConnectors.pcie6pin <= parseInt(parsedContent['PCIe 6-Pin Connectors'] || '0'));

        if (!hasRequiredConnectors) {
          return null;
        }

        return {
          id: `psu-${index}`,
          name: parsedContent.Name,
          image: parsedContent['Image URL'],
          manufacturer: parsedContent.Manufacturer || 'Unknown',
          price: price,
          wattage: wattage,
          efficiency: parsedContent['Efficiency Rating'] || 'Unknown',
          modular: parsedContent.Modular || 'Unknown',
          length: parsedContent.Length || 'Unknown',
          connectors: {
            eps: parsedContent['EPS 8-Pin Connectors'] || '0',
            pcie8pin: parsedContent['PCIe 8-Pin Connectors'] || '0',
            pcie6pin: parsedContent['PCIe 6-Pin Connectors'] || '0',
            sata: parsedContent['SATA Connectors'] || '0',
            molex: parsedContent['Molex 4-Pin Connectors'] || '0'
          },
          score: 0.8 - (index * 0.05),
          isRecommended: index < 5,
          compatibility: {
            wattageOk: true,
            connectorsOk: true
          },
          reasons: [
            `${wattage}W sufficient for ${requiredWattage}W system`,
            parsedContent['Efficiency Rating'] ? `${parsedContent['Efficiency Rating']} efficiency` : null,
            parsedContent.Modular === 'Full' ? 'Fully modular design' : null,
            'Has all required power connectors'
          ].filter(Boolean)
        };
      })
      .filter((psu): psu is NonNullable<typeof psu> => psu !== null)
      .sort((a, b) => {
        // Sort by efficiency rating first, then price
        const efficiencyOrder = {'80+ Titanium': 5, '80+ Platinum': 4, '80+ Gold': 3, '80+ Silver': 2, '80+ Bronze': 1};
        const aEff = efficiencyOrder[a.efficiency as keyof typeof efficiencyOrder] || 0;
        const bEff = efficiencyOrder[b.efficiency as keyof typeof efficiencyOrder] || 0;
        
        if (aEff !== bEff) return bEff - aEff;
        return a.price - b.price;
      });

    debugLog('Processed PSUs Sample', powerSupplies.slice(0, 2));

    // Handle no results case
    if (powerSupplies.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible power supplies found',
        details: 'Try adjusting your search terms or budget range',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedPSUs = powerSupplies.slice(startIndex, startIndex + itemsPerPage);

    const response = {
      powerSupplies: paginatedPSUs,
      totalCount: powerSupplies.length,
      page,
      itemsPerPage,
      searchTerm,
      budget,
      systemRequirements: {
        requiredWattage,
        requiredConnectors,
        recommendedWattage: Math.ceil(requiredWattage * 1.2),
      },
      searchCriteria: {
        priceRange: {
          min: minBudget,
          max: maxBudget
        },
        minimumWattage: requiredWattage,
        requiredConnectors,
        features: ['Modular', 'High Efficiency', 'Silent Operation']
      }
    };

    debugLog('Final Response Stats', {
      totalResults: response.totalCount,
      currentPage: response.page,
      resultsInPage: response.powerSupplies.length
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process PSU recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}