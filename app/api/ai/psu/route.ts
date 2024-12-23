import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

interface SystemComponent {
  specifications?: {
    tdp?: number | string;
    powerConnectors?: string;
  };
}

interface SystemComponents {
  cpu?: SystemComponent;
  gpu?: SystemComponent;
  memory?: {
    specifications?: {
      modules?: string;
      speed?: string;
    };
  };
  motherboard?: any;
  storage?: any;
}

const debugLog = (step: string, data: any) => {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

const calculateSystemPower = (components: SystemComponents) => {
  const powerBreakdown = {
    basePower: 50,  // Base system power (motherboard, fans)
    cpuPower: 0,
    gpuPower: 0,
    memoryPower: 0,
    storagePower: 10,
    overhead: 0
  };

  // CPU Power
  if (components.cpu?.specifications?.tdp) {
    powerBreakdown.cpuPower = parseInt(components.cpu.specifications.tdp.toString());
  }

  // GPU Power
  if (components.gpu?.specifications?.tdp) {
    const tdpString = components.gpu.specifications.tdp.toString();
    powerBreakdown.gpuPower = parseInt(tdpString.replace(/\D/g, ''));
  }

  // Memory Power
  if (components.memory?.specifications?.modules) {
    const moduleCount = parseInt(components.memory.specifications.modules.split('x')[0]) || 2;
    const isDDR5 = components.memory.specifications.speed?.includes('DDR5');
    powerBreakdown.memoryPower = moduleCount * (isDDR5 ? 5 : 3);
  }

  // Calculate total and add 20% overhead
  const subtotal = Object.values(powerBreakdown).reduce((a, b) => a + b, 0);
  powerBreakdown.overhead = Math.ceil(subtotal * 0.2);

  return {
    breakdown: powerBreakdown,
    total: Math.ceil(subtotal + powerBreakdown.overhead),
    recommended: Math.ceil((subtotal + powerBreakdown.overhead) * 1.2)
  };
};

const getRequiredConnectors = (components: SystemComponents) => {
  const required = {
    eps8pin: 0,
    pcie8pin: 0,
    pcie6pin: 0,
    pcie12pin: 0,
    sata: 2,
    molex: 1
  };

  // CPU Power Requirements
  if (components.cpu?.specifications?.tdp) {
    const tdp = parseInt(components.cpu.specifications.tdp.toString());
    if (tdp > 125) {
      required.eps8pin = 2;
    } else if (tdp > 65) {
      required.eps8pin = 1;
    }
  }

  // GPU Power Requirements
  if (components.gpu?.specifications?.powerConnectors) {
    const connectors = components.gpu.specifications.powerConnectors;
    if (connectors.includes('16-pin') || connectors.includes('12VHPWR')) {
      required.pcie12pin = 1;
    } else {
      required.pcie8pin = (connectors.match(/8-pin/g) || []).length;
      required.pcie6pin = (connectors.match(/6-pin/g) || []).length;
    }
  }

  return required;
};

const generateRecommendationReasons = (
  psu: any, 
  powerRequirements: any, 
  components: SystemComponents
) => {
  const reasons = [];

  // Power Capability
  reasons.push(
    `${psu.wattage}W capacity provides${psu.wattage >= powerRequirements.recommended ? ' ample' : ' sufficient'} power ` +
    `for your ${powerRequirements.total}W system (CPU: ${powerRequirements.breakdown.cpuPower}W, ` +
    `GPU: ${powerRequirements.breakdown.gpuPower}W)`
  );

  // Efficiency
  const efficiencyMap: { [key: string]: string } = {
    '80+ Titanium': 'Up to 94% efficiency, minimizing power loss and heat',
    '80+ Platinum': 'Up to 92% efficiency, excellent power delivery',
    '80+ Gold': 'Up to 90% efficiency, great power delivery',
    '80+ Silver': 'Up to 88% efficiency, good power delivery',
    '80+ Bronze': 'Up to 85% efficiency, decent power delivery'
  };
  if (psu.efficiency in efficiencyMap) {
    reasons.push(efficiencyMap[psu.efficiency]);
  }

  // Modularity Benefits
  if (psu.modular?.toLowerCase().includes('full')) {
    reasons.push('Fully modular design allows for clean cable management and optimal airflow');
  } else if (psu.modular?.toLowerCase().includes('semi')) {
    reasons.push('Semi-modular design offers good cable management flexibility');
  }

  // Power Headroom
  const headroomPercentage = ((psu.wattage - powerRequirements.total) / powerRequirements.total * 100).toFixed(0);
  reasons.push(`${headroomPercentage}% power headroom available for future upgrades`);

  return reasons;
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
  
  return result;
};

export async function POST(req: Request) {
  try {
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", components } = await req.json();
    debugLog('Request Parameters', { budget, components });

    // Calculate power requirements
    const powerRequirements = calculateSystemPower(components);
    const requiredConnectors = getRequiredConnectors(components);

    debugLog('Power Requirements', powerRequirements);
    debugLog('Required Connectors', requiredConnectors);

    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    // Construct search string
    const searchString = `
      power supply PSU
      minimum wattage ${powerRequirements.recommended}W
      ${requiredConnectors.pcie12pin ? '12VHPWR/16-pin connector' : ''}
      ${requiredConnectors.pcie8pin > 0 ? `${requiredConnectors.pcie8pin}x PCIe 8-pin` : ''}
      ${requiredConnectors.eps8pin > 0 ? `${requiredConnectors.eps8pin}x EPS 8-pin` : ''}
      reliable brand high quality
      80 Plus efficiency
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    const searchResults = await vectorStore.similaritySearch(searchString, 50);
    
    const processedPSUs = searchResults
      .map(result => {
        const data = parsePageContent(result.pageContent);
        if (!data.Name || !data.Price) return null;

        const price = parseFloat(data.Price.replace(/[^0-9.]/g, ''));
        const wattage = parseInt(data.Wattage) || 0;

        if (price === 0 || wattage < powerRequirements.total) {
          return null;
        }

        const psu = {
          id: `psu-${data.Name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: data.Name,
          manufacturer: data.Manufacturer || 'Unknown',
          price,
          wattage,
          efficiency: data['Efficiency Rating'] || 'Standard',
          modular: data.Modular || 'Non-modular',
          formFactor: data.Type || 'ATX',
          length: data.Length || 'Unknown',
          connectors: {
            eps8pin: parseInt(data['EPS 8-Pin Connectors'] || '0'),
            pcie8pin: parseInt(data['PCIe 8-Pin Connectors'] || '0'),
            pcie6pin: parseInt(data['PCIe 6-Pin Connectors'] || '0'),
            pcie12pin: parseInt(data['PCIe 12-Pin Connectors'] || '0'),
            sata: parseInt(data['SATA Connectors'] || '0'),
            molex: parseInt(data['Molex 4-Pin Connectors'] || '0')
          },
          image: data['Image URL'] || ''
        };

        // Check connector compatibility
        const hasRequiredConnectors = 
          (psu.connectors.eps8pin >= requiredConnectors.eps8pin) &&
          ((psu.connectors.pcie12pin >= requiredConnectors.pcie12pin) ||
           (psu.connectors.pcie8pin >= requiredConnectors.pcie8pin && 
            psu.connectors.pcie6pin >= requiredConnectors.pcie6pin));

        if (!hasRequiredConnectors) {
          return null;
        }

        const reasons = generateRecommendationReasons(psu, powerRequirements, components);
        const score = 
          ((psu.wattage >= powerRequirements.recommended ? 40 : 30) +
           (psu.efficiency.includes('Titanium') ? 30 :
            psu.efficiency.includes('Platinum') ? 25 :
            psu.efficiency.includes('Gold') ? 20 :
            psu.efficiency.includes('Silver') ? 15 :
            psu.efficiency.includes('Bronze') ? 10 : 5) +
           (psu.modular.toLowerCase().includes('full') ? 15 :
            psu.modular.toLowerCase().includes('semi') ? 10 : 0));

        return {
          ...psu,
          score,
          isRecommended: score >= 80,
          reasons,
          powerRequirements: {
            system: powerRequirements.total,
            recommended: powerRequirements.recommended,
            provided: psu.wattage,
            headroom: psu.wattage - powerRequirements.total,
            breakdown: powerRequirements.breakdown
          }
        };
      })
      .filter((psu): psu is NonNullable<typeof psu> => psu !== null)
      .sort((a, b) => b.score - a.score);

    const response = {
      powerSupplies: processedPSUs.slice((page - 1) * itemsPerPage, page * itemsPerPage),
      totalCount: processedPSUs.length,
      page,
      itemsPerPage,
      systemRequirements: {
        powerBreakdown: powerRequirements.breakdown,
        totalRequired: powerRequirements.total,
        recommended: powerRequirements.recommended,
        connectors: requiredConnectors
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
      error: 'Failed to process PSU recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}