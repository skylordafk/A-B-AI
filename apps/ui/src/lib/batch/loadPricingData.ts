// Removed unused import: BatchRow

interface PricingData {
  [provider: string]: {
    [model: string]: {
      prompt: number;
      completion: number;
    };
  };
}

// Parse pricing string to number (per 1K tokens)
function parsePriceToNumber(priceStr: string): number {
  // Handle special cases
  if (priceStr.includes('Free') || priceStr.includes('unlimited')) {
    return 0;
  }

  // Extract number from string like "$10.00 per 1M tokens"
  const match = priceStr.match(/\$(\d+(?:\.\d+)?)\s*per\s*1M\s*tokens/);
  if (match) {
    // Convert from per 1M to per 1K tokens
    return parseFloat(match[1]) / 1000;
  }

  // For complex pricing (e.g., tiered), use the lower tier as default
  const tierMatch = priceStr.match(/\$(\d+(?:\.\d+)?)\s*per\s*1M\s*tokens\s*for\s*[<≤]/);
  if (tierMatch) {
    return parseFloat(tierMatch[1]) / 1000;
  }

  return -1; // Unknown pricing
}

// Process raw pricing data into our format
function processPricingData(rawData: Record<string, unknown>): PricingData {
  const pricingData: PricingData = {};

  // Convert the raw data to our format
  for (const [provider, models] of Object.entries(rawData)) {
    const providerKey = provider.toLowerCase();
    pricingData[providerKey] = {};

    for (const [modelName, pricing] of Object.entries(models as Record<string, unknown>)) {
      let inputPrice = -1;
      let outputPrice = -1;

      const pricingObj = pricing as Record<string, unknown>;
      if (
        pricingObj.input_price &&
        pricingObj.output_price &&
        typeof pricingObj.input_price === 'string' &&
        typeof pricingObj.output_price === 'string'
      ) {
        inputPrice = parsePriceToNumber(pricingObj.input_price);
        outputPrice = parsePriceToNumber(pricingObj.output_price);
      } else if (pricingObj.pricing) {
        // Handle special pricing like gpt-4.1-mini
        inputPrice = 0;
        outputPrice = 0;
      }

      pricingData[providerKey][modelName] = {
        prompt: inputPrice,
        completion: outputPrice,
      };
    }
  }

  // Map Gemini models correctly
  if (pricingData.google) {
    pricingData.gemini = {
      'models/gemini-2.5-flash-preview': pricingData.google['gemini-2.5-flash-preview'] || {
        prompt: 0.00035,
        completion: 0.00175,
      },
      'models/gemini-2.5-pro-thinking': pricingData.google['gemini-2.5-pro-thinking'] || {
        prompt: 0.00125,
        completion: 0.01,
      },
    };
  }

  return pricingData;
}

// Load pricing data from the JSON file
export async function loadPricingData(): Promise<PricingData> {
  try {
    // Check if we're in a Node.js environment (testing)
    if (typeof window === 'undefined') {
      // Node.js environment - use dynamic import
      const path = await import('path');
      const fs = await import('fs');
      const filePath = path.resolve(process.cwd(), 'AI Model Pricing JSON.json');
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return processPricingData(rawData);
    }

    // Browser environment - use fetch
    const response = await fetch('/AI Model Pricing JSON.json');
    if (!response.ok) {
      throw new Error('Failed to load pricing data');
    }

    const rawData = await response.json();
    return processPricingData(rawData);
  } catch (error) {
    console.error('Failed to load pricing data, using defaults:', error);

    // Return default pricing if loading fails (values in per-1K tokens)
    return {
      openai: {
        'gpt-4.1': { prompt: 0.002, completion: 0.008 },
        'gpt-4.1-mini': { prompt: 0.0004, completion: 0.0016 },
        'gpt-4.1-nano': { prompt: 0.0001, completion: 0.0004 },
        'gpt-4o': { prompt: 0.0025, completion: 0.005 },
        'gpt-4o-mini': { prompt: 0.0006, completion: 0.0024 },
        'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
        'o3-2025-04-16': { prompt: 0.002, completion: 0.008 },
      },
      anthropic: {
        'claude-opus-4-20250514': { prompt: 0.015, completion: 0.075 },
        'claude-sonnet-4': { prompt: 0.003, completion: 0.015 },
        'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
        'claude-3-5-haiku': { prompt: 0.0008, completion: 0.004 },
        'claude-3-7-sonnet': { prompt: 0.003, completion: 0.015 },
        'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
        'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
        'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
        'claude-3-haiku': { prompt: 0.0008, completion: 0.004 },
      },
      grok: {
        'grok-3': { prompt: 0.003, completion: 0.015 },
        'grok-3-mini': { prompt: 0.0003, completion: 0.0005 },
      },
      gemini: {
        'models/gemini-2.5-flash-preview': { prompt: 0.00035, completion: 0.00175 },
        'models/gemini-2.5-pro-thinking': { prompt: 0.00125, completion: 0.01 },
      },
    };
  }
}

// Get provider and model from model string
export function getProviderAndModel(modelString?: string): { provider: string; model: string } {
  if (!modelString) {
    return { provider: 'openai', model: 'o3-2025-04-16' };
  }

  // Handle provider/model format
  if (modelString.includes('/')) {
    const firstSlashIndex = modelString.indexOf('/');
    const provider = modelString.substring(0, firstSlashIndex);
    const model = modelString.substring(firstSlashIndex + 1);
    return { provider, model };
  }

  // Try to infer provider from model name
  if (modelString.includes('gpt') || modelString.includes('o3')) {
    return { provider: 'openai', model: modelString };
  }
  if (modelString.includes('claude')) {
    return { provider: 'anthropic', model: modelString };
  }
  if (modelString.includes('gemini')) {
    return { provider: 'gemini', model: modelString };
  }
  if (modelString.includes('grok')) {
    return { provider: 'grok', model: modelString };
  }

  // Default to openai
  return { provider: 'openai', model: modelString };
}
