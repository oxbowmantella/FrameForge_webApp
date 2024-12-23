import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

// Parse the case data
const parsePageContent = (content: string) => {
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

export async function POST(req: Request) {
  try {
    const { budget, page = 1, itemsPerPage = 10, searchTerm = "", components } = await req.json();

    // Initialize vector store
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    const index = pinecone.Index("pc-parts");
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index
    });

    // Get motherboard form factor
    const formFactor = components.motherboard?.specifications?.formFactor || 'ATX';
    
    // Calculate GPU length needed (with 20mm cable clearance)
    const gpuLength = components.gpu?.specifications?.length 
      ? parseInt(components.gpu.specifications.length) + 20 
      : 320; // Default to 320mm if no GPU

    // Search for cases
    const searchString = `
      computer cases with:
      price under $${budget * 0.15}
      supports ${formFactor}
      minimum ${gpuLength}mm GPU clearance
      good airflow
      ${searchTerm}
    `.trim();

    const searchResults = await vectorStore.similaritySearch(searchString, 50);

    // Process results
    const cases = searchResults
      .map(result => {
        const data = parsePageContent(result.pageContent);
        if (!data.Name || !data.Price) return null;

        const price = parseFloat(data.Price.replace(/[$,]/g, ''));
        if (isNaN(price) || price === 0 || price > budget * 0.15) return null;

        // Check form factor support
        const supportedFormFactors = (data['Motherboard Form Factor'] || '').split(',');
        if (!supportedFormFactors.some(ff => 
          ff.trim().toLowerCase() === formFactor.toLowerCase())) {
          return null;
        }

        // Check GPU clearance
        const maxGpuLength = parseInt(data['Maximum Video Card Length'] || '0');
        if (maxGpuLength < gpuLength) return null;

        return {
          id: `case-${data.Name.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: data.Name,
          image: data['Image URL'],
          manufacturer: data.Manufacturer || 'Unknown',
          price,
          type: data.Type || 'ATX Mid Tower',
          maxGpuLength,
          formFactors: supportedFormFactors,
          hasUSBC: data['HasUSBC'] === 'Yes',
          frontPorts: data['Front Panel USB'] || 'Unknown',
          reasons: [
            `Fits your ${formFactor} motherboard`,
            `Supports GPUs up to ${maxGpuLength}mm`,
            data['HasUSBC'] === 'Yes' ? 'Has front USB-C' : null,
            data.Type?.toLowerCase().includes('mesh') ? 'Good airflow design' : null
          ].filter(Boolean)
        };
      })
      .filter((case_): case_ is NonNullable<typeof case_> => case_ !== null)
      .sort((a, b) => a.price - b.price);

    if (cases.length === 0) {
      return new NextResponse(JSON.stringify({
        error: 'No compatible cases found',
        details: 'Try adjusting your search criteria'
      }), { status: 404 });
    }

    // Paginate
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedCases = cases.slice(startIndex, startIndex + itemsPerPage);

    return new NextResponse(JSON.stringify({
      cases: paginatedCases,
      totalCount: cases.length,
      page,
      itemsPerPage
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to process case recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}