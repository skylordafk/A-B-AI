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

// Load pricing data from the JSON file
export async function loadPricingData(): Promise<PricingData> {
  try {
    // Try to load from the file system
    const response = await fetch('/AI Model Pricing JSON.json');
    if (!response.ok) {
      throw new Error('Failed to load pricing data');
    }

    const rawData = await response.json();
    const pricingData: PricingData = {};

    // Convert the raw data to our format
    for (const [provider, models] of Object.entries(rawData)) {
      const providerKey = provider.toLowerCase();
      pricingData[providerKey] = {};

      for (const [modelName, pricing] of Object.entries(models as any)) {
        let inputPrice = -1;
        let outputPrice = -1;

        const pricingObj = pricing as any;
        if (pricingObj.input_price && pricingObj.output_price) {
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
  } catch (error) {
    console.error('Failed to load pricing data, using defaults:', error);

    // Return default pricing if loading fails
    return {
      openai: {
        'o3-2025-04-16': { prompt: 2, completion: 8 },
        'gpt-4.1-mini': { prompt: 0.4, completion: 1.6 },
      },
      anthropic: {
        'claude-opus-4-20250514': { prompt: 15, completion: 75 },
        'claude-3-haiku': { prompt: 0.8, completion: 4 },
      },
      grok: {
        'grok-3': { prompt: 3, completion: 15 },
        'grok-3-mini': { prompt: 0.3, completion: 0.5 },
      },
      gemini: {
        'models/gemini-2.5-flash-preview': { prompt: 0.35, completion: 1.75 },
        'models/gemini-2.5-pro-thinking': { prompt: 1.25, completion: 10 },
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
