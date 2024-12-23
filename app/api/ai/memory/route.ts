import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

const debugLog = (step: string, data: any) => {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

const parseMemoryData = (content: string) => {
  try {
    const lines = content.split('\n');
    const data: Record<string, string> = {};
    
    lines.forEach(line => {
      const [key, ...values] = line.split(':');
      if (key && values.length) {
        data[key.trim()] = values.join(':').trim();
      }
    });

    debugLog('Parsed Memory Data', data);
    return data;
  } catch (error) {
    console.error('Error parsing memory data:', error);
    return {};
  }
};

// Helper to check memory compatibility based on motherboard/CPU specs
const isMemoryCompatible = (memoryData: Record<string, string>, motherboard: any) => {
  if (!motherboard) return true; // If no motherboard specified, don't filter

  // Check if it's desktop memory (DIMM)
  const formFactor = memoryData['Form Factor']?.toLowerCase() || '';
  if (!formFactor.includes('dimm') || formFactor.includes('sodimm')) {
    debugLog('Filtered out - Wrong form factor', formFactor);
    return false;
  }

  // Dynamic memory type compatibility check
  if (motherboard.specifications?.memoryType) {
    const supportedType = motherboard.specifications.memoryType.toLowerCase();
    const memoryType = memoryData['Speed']?.toLowerCase() || '';
    
    // Extract DDR generation (e.g., "ddr4", "ddr5")
    const supportedDDR = supportedType.match(/(ddr\d)/i)?.[1]?.toLowerCase();
    const memoryDDR = memoryType.match(/(ddr\d)/i)?.[1]?.toLowerCase();
    
    if (supportedDDR && memoryDDR && supportedDDR !== memoryDDR) {
      debugLog('Filtered out - Incompatible DDR generation', {
        supported: supportedDDR,
        memory: memoryDDR
      });
      return false;
    }
  }

  return true;
};

const calculatePerformanceScore = (memory: any, motherboard: any) => {
  let score = 60; // Base score
  
  // Speed scoring based on motherboard's supported speeds
  const speedMatch = memory.speed?.match(/DDR[45]-(\d+)/) || [];
  const speed = parseInt(speedMatch[1] || '0');
  if (speed > 0) {
    // Get supported memory speeds from motherboard if available
    const supportedSpeeds = motherboard?.specifications?.memorySpeeds || [];
    if (supportedSpeeds.length > 0) {
      const maxSupported = Math.max(...supportedSpeeds.map((s: string) => 
        parseInt(s.match(/\d+/)?.[0] || '0')));
      score += Math.min(20, (speed / maxSupported) * 20);
    } else {
      // Fallback scoring if no supported speeds specified
      score += Math.min(20, (speed / 3200) * 20);
    }
  }
  
  // Capacity scoring
  const modulesMatch = memory.modules?.match(/(\d+)\s*x\s*(\d+)/);
  if (modulesMatch) {
    const totalGB = parseInt(modulesMatch[1]) * parseInt(modulesMatch[2]);
    score += Math.min(10, (totalGB / 32) * 10);
  }
  
  // Features scoring
  if (memory.heatSpreader) score += 5;
  if (memory.timing) score += 5;
  
  return Math.min(100, Math.max(0, score));
};

export async function POST(req: Request) {
  try {
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", motherboard, cpu } = await req.json();
    debugLog('Request Parameters', { budget, motherboard, cpu, page, itemsPerPage });

    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    // Construct search string based on motherboard specs
    const searchString = `
      desktop memory RAM modules DIMM
      ${motherboard?.specifications?.memoryType ? 
        `${motherboard.specifications.memoryType} compatible memory` : 
        'memory modules'}
      NOT SODIMM
      NOT laptop memory
      ${searchTerm}
    `.trim();

    debugLog('Search String', searchString);

    const searchResults = await vectorStore.similaritySearch(searchString, 100);
    debugLog('Initial Results Count', searchResults.length);

    const processedMemory = searchResults
      .map(result => {
        const data = parseMemoryData(result.pageContent);
        if (!data.Name) return null;

        // Check compatibility first
        if (!isMemoryCompatible(data, motherboard)) {
          return null;
        }

        // Parse price
        let price = 0;
        try {
          price = parseFloat(data.Price?.replace(/[^0-9.]/g, '') || '0');
        } catch (e) {
          return null;
        }

        // Skip only if price is 0 or invalid
        if (price === 0) {
          return null;
        }

        const memory = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: data.Name,
          manufacturer: data.Manufacturer || 'Unknown',
          price,
          image: data['Image URL'] || '',
          speed: data.Speed || 'Unknown',
          modules: data.Modules || 'Unknown',
          pricePerGB: data['Price / GB'] || 'N/A',
          timing: data.Timing || 'Unknown',
          latency: data['CAS Latency'] || 'Unknown',
          voltage: data.Voltage || 'Unknown',
          heatSpreader: data['Heat Spreader']?.toLowerCase() === 'yes',
          formFactor: data['Form Factor'] || 'DIMM'
        };

        const score = calculatePerformanceScore(memory, motherboard);

        return {
          ...memory,
          score,
          isRecommended: score >= 70,
          reasons: [
            `Compatible with ${motherboard?.name || 'your system'}`,
            `${memory.speed} speed${memory.timing ? ` with ${memory.timing} timing` : ''}`,
            memory.modules ? `${memory.modules} configuration` : null,
            memory.heatSpreader ? 'Includes heat spreader for better cooling' : null,
            memory.pricePerGB !== 'N/A' ? `Value: ${memory.pricePerGB}/GB` : null
          ].filter(Boolean)
        };
      })
      .filter((mem): mem is NonNullable<typeof mem> => mem !== null)
      .sort((a, b) => b.score - a.score);

    debugLog('Processed Memory Count', processedMemory.length);

    const response = {
      memory: processedMemory.slice((page - 1) * itemsPerPage, page * itemsPerPage),
      totalCount: processedMemory.length,
      page,
      itemsPerPage,
      searchCriteria: {
        priceRange: {
          min: 0, // No minimum budget restriction
          max: budget // Use full budget as maximum
        },
        memoryType: motherboard?.specifications?.memoryType || 'Any',
        maxMemory: motherboard?.specifications?.memoryMax || 'Any',
        recommendedSpeeds: motherboard?.specifications?.memorySpeeds || [],
        features: ['Heat Spreader', 'XMP Support', 'Low Latency']
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
      error: 'Failed to process memory recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}