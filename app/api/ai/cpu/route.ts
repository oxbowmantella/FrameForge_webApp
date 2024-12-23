// app/api/ai/cpu/route.ts

import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

interface CPUResponse {
  name: string;
  price: number;
  socket: string;
  coreCount: string;
  coreClock: string;
  boostClock: string;
  tdp: string;
  features: {
    integratedGraphics: string | null;
    includesCooler: boolean;
    cache: {
      l2: string;
      l3: string;
    };
  };
  details: {
    manufacturer: string;
    series: string;
    image: string;
  };
  recommendation: {
    isRecommended: boolean;
    summary: string;
    reasons: string[];
    performanceScore: number;
  };
}

interface APIResponse {
  cpus: CPUResponse[];
  metadata: {
    totalPages: number;
    currentPage: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
}

// Helper to determine price range and build context
const getCPUTier = (budget: number) => {
  if (budget <= 1000) {
    return {
      range: { min: 150, max: 300 },
      type: 'budget',
      focus: 'value and efficiency',
      requirements: 'good performance for everyday tasks and light gaming'
    };
  } else if (budget <= 2000) {
    return {
      range: { min: 250, max: 500 },
      type: 'midRange',
      focus: 'balanced performance',
      requirements: 'strong gaming and multitasking capabilities'
    };
  } else {
    return {
      range: { min: 400, max: 800 },
      type: 'highEnd',
      focus: 'maximum performance',
      requirements: 'extreme multitasking and demanding workloads'
    };
  }
};

// Parse CPU data from vector store result
const parseCPUData = (content: string): Record<string, string> => {
  const lines = content.split('\n');
  const data: Record<string, string> = {};
  
  lines.forEach(line => {
    const [key, ...values] = line.split(':');
    if (key && values.length) {
      data[key.trim()] = values.join(':').trim();
    }
  });
  
  return data;
};

// Calculate performance score for sorting/ranking
const calculatePerformanceScore = (cpu: any): number => {
  let score = 0;
  
  // Core count contribution (up to 40 points)
  const cores = parseInt(cpu.coreCount?.replace(/\D/g, '') || '0');
  score += (cores / 16) * 40; // Normalized to 16 cores max
  
  // Clock speed contribution (up to 30 points)
  const baseClock = parseFloat(cpu.coreClock?.replace(/[^0-9.]/g, '') || '0');
  const boostClock = parseFloat(cpu.boostClock?.replace(/[^0-9.]/g, '') || '0');
  score += ((baseClock + boostClock) / 2 / 5.0) * 30; // Normalized to 5.0 GHz
  
  // Cache contribution (up to 20 points)
  const l3Cache = parseInt(cpu.features.cache.l3?.replace(/[^0-9]/g, '') || '0');
  score += (l3Cache / 128) * 20; // Normalized to 128MB max
  
  // Power/TDP contribution (up to 10 points)
  const tdp = parseInt(cpu.tdp?.replace(/\D/g, '') || '0');
  if (tdp > 0) {
    score += (tdp / 125) * 10; // Normalized to 125W
  }
  
  return Math.min(Math.round(score), 100);
};

// Evaluate CPU and generate recommendation
const evaluateCPU = (cpu: any, tierInfo: ReturnType<typeof getCPUTier>, performanceScore: number) => {
  const reasons: string[] = [];
  
  // Core evaluation
  const cores = parseInt(cpu.coreCount?.replace(/\D/g, '') || '0');
  if (cores > 0) {
    reasons.push(
      cores >= 12 ? `Excellent ${cores}-core configuration for heavy multitasking` :
      cores >= 8 ? `Strong ${cores}-core setup for gaming and productivity` :
      cores >= 6 ? `Capable ${cores}-core processor for mainstream use` :
      `Basic ${cores}-core processor for general computing`
    );
  }

  // Clock speed evaluation
  const boostClock = cpu.boostClock || cpu.coreClock;
  if (boostClock) {
    reasons.push(`Reaches ${boostClock} for strong single-threaded performance`);
  }

  // Cache evaluation
  if (cpu.features.cache.l3 !== 'Unknown' && cpu.features.cache.l3 !== '0 MB') {
    reasons.push(`${cpu.features.cache.l3} L3 cache enhances overall responsiveness`);
  }

  // Features evaluation
  if (cpu.features.integratedGraphics) {
    reasons.push(
      tierInfo.type === 'budget'
        ? `Integrated ${cpu.features.integratedGraphics} provides basic graphics capability`
        : `Includes ${cpu.features.integratedGraphics} as a backup display option`
    );
  }

  if (cpu.features.includesCooler) {
    reasons.push(
      tierInfo.type === 'budget'
        ? 'Bundled cooler provides immediate cost savings'
        : 'Includes stock cooler, though aftermarket cooling recommended for maximum performance'
    );
  }

  return {
    isRecommended: false, // Will be set later for top 3
    summary: `${tierInfo.type === 'highEnd' ? 'High-performance' : 
              tierInfo.type === 'midRange' ? 'Balanced' : 
              'Value-oriented'} processor with a performance score of ${performanceScore}/100`,
    reasons,
    performanceScore
  };
};

export async function POST(req: Request) {
  console.log('🚀 Starting CPU route handler');
  
  try {
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    const { budget, cpuBrand, page = 1 } = await req.json();
    const itemsPerPage = 10;
    
    console.log('📥 Request:', { budget, cpuBrand, page });

    const tierInfo = getCPUTier(budget);
    console.log('📊 Build Tier:', tierInfo);

    // Initialize AI services
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    // Construct search query
    const query = `
      Find ${cpuBrand || ''} processors
      Price range $${tierInfo.range.min} to $${tierInfo.range.max}
      ${tierInfo.focus}
      ${tierInfo.requirements}
    `.trim();

    console.log('🔍 Query:', query);

    // Perform search
    const searchResults = await vectorStore.similaritySearch(query, 50);
    console.log(`✨ Found ${searchResults.length} initial results`);

    // Log initial results sample
    console.log('\n📝 Initial Results Sample:');
    searchResults.slice(0, 5).forEach((result, index) => {
      const data = parseCPUData(result.pageContent);
      console.log(`\nCPU ${index + 1}:`);
      console.log(`Name: ${data.Name}`);
      console.log(`Price: ${data.Price}`);
      console.log(`Clock: ${data['Performance Core Clock'] || data['Core Clock']}`);
      console.log(`Boost: ${data['Performance Core Boost Clock'] || data['Boost Clock']}`);
    });

    // Process all CPUs
    let cpus: CPUResponse[] = searchResults
      .map(result => {
        const data = parseCPUData(result.pageContent);
        const price = parseFloat(data.Price?.replace(/[$,]/g, '') || '0');
        
        // Log processing details
        console.log('\n🔄 Processing CPU:');
        console.log(`Name: ${data.Name}`);
        console.log(`Raw Price: ${data.Price}`);
        console.log(`Parsed Price: ${price}`);

        // Skip invalid CPUs
        if (!price || !data.Name || 
            (cpuBrand && !data.Manufacturer?.toLowerCase().includes(cpuBrand.toLowerCase()))) {
          console.log('❌ Skipping: Invalid price or brand mismatch');
          return null;
        }

        // Create CPU object
        const cpu: CPUResponse = {
          name: data.Name,
          price,
          socket: data.Socket || 'Unknown',
          coreCount: data['Core Count'] || 'Unknown',
          coreClock: data['Performance Core Clock'] || data['Core Clock'] || 'Unknown',
          boostClock: data['Performance Core Boost Clock'] || data['Boost Clock'] || 'Unknown',
          tdp: data.TDP || 'Unknown',
          features: {
            integratedGraphics: data['Integrated Graphics'] || null,
            includesCooler: 
              data['Includes Cooler']?.toLowerCase() === 'yes' || 
              data['Includes CPU Cooler']?.toLowerCase() === 'yes',
            cache: {
              l2: data['L2 Cache'] || 'Unknown',
              l3: data['L3 Cache'] || 'Unknown'
            }
          },
          details: {
            manufacturer: data.Manufacturer || 'Unknown',
            series: data.Series || 'Unknown',
            image: data['Image URL'] || ''
          },
          recommendation: {
            isRecommended: false,
            summary: '',
            reasons: [],
            performanceScore: 0
          }
        };

        // Calculate performance score
        const performanceScore = calculatePerformanceScore(cpu);
        console.log(`Performance Score: ${performanceScore}`);

        // Generate recommendation
        cpu.recommendation = evaluateCPU(cpu, tierInfo, performanceScore);
        
        return cpu;
      })
      .filter((cpu): cpu is CPUResponse => cpu !== null);

    console.log(`✅ Processed ${cpus.length} valid CPUs`);

    // Sort by performance score
    cpus.sort((a, b) => b.recommendation.performanceScore - a.recommendation.performanceScore);

    // Mark top 3 as recommended
    cpus.slice(0, 3).forEach(cpu => {
      cpu.recommendation.isRecommended = true;
      cpu.recommendation.summary = 'Top Recommended: ' + cpu.recommendation.summary;
    });

    // Handle no results
    if (cpus.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No CPUs found',
        details: 'Try adjusting your budget or brand selection',
        tierInfo
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate results
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedCPUs = cpus.slice(startIndex, startIndex + itemsPerPage);
    
    const response: APIResponse = {
      cpus: paginatedCPUs,
      metadata: {
        totalPages: Math.ceil(cpus.length / itemsPerPage),
        currentPage: page,
        priceRange: tierInfo.range
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
    console.error('❌ Error:', error);
    
    return new NextResponse(JSON.stringify({
      error: 'Failed to process CPU recommendations',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}