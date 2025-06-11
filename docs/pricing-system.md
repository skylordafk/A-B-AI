# Pricing System Documentation

## Overview

The A-B/AI application uses a dynamic pricing system that loads model pricing data from the `AI Model Pricing JSON.json` file. This allows for easy updates to pricing without modifying code.

## Pricing Data Source

The pricing data is stored in `/AI Model Pricing JSON.json` (also available in `apps/ui/public/` for frontend access). This file contains pricing information for all supported models across different providers.

### File Format

```json
{
  "Provider": {
    "model-name": {
      "input_price": "$X.XX per 1M tokens",
      "output_price": "$Y.YY per 1M tokens"
    }
  }
}
```

## Pricing Calculation

### Pre-Processing (Dry-Run Estimate)

Before running a batch job, the system calculates input token costs by:

1. Loading the current pricing data from the JSON file
2. Calculating input tokens for each prompt (including system prompts)
3. Calculating input cost only using the formula:
   ```
   cost = (input_tokens / 1000) * input_price_per_1k
   ```

Note: Output tokens are unknown until the API responds, so dry-run only shows input costs.

### Post-Processing (Actual Cost)

After processing, the system calculates actual costs using:

1. Real input token count from the request
2. Real output token count from the response
3. Current pricing from the JSON file
4. Formula:
   ```
   cost = (actual_input_tokens / 1000) * input_price_per_1k + (actual_output_tokens / 1000) * output_price_per_1k
   ```

## Supported Models

The batch template (`batch-template.csv`) includes all 8 supported models:

1. **OpenAI**

   - `openai/o3-2025-04-16` - Advanced reasoning model ($10/$40 per 1M tokens)
   - `openai/gpt-4.1-mini` - Free model with unlimited access

2. **Anthropic**

   - `anthropic/claude-opus-4-20250514` - Advanced reasoning model ($15/$75 per 1M tokens)
   - `anthropic/claude-3-haiku` - Fast, cost-effective model ($0.80/$4.00 per 1M tokens)

3. **Google Gemini**

   - `gemini/models/gemini-2.5-pro-thinking` - Thinking model with tiered pricing
   - `gemini/models/gemini-2.5-flash-preview` - Fast and efficient Gemini model

4. **Grok**
   - `grok/grok-3` - Latest high-end model ($3/$15 per 1M tokens)
   - `grok/grok-3-mini` - Low-cost, high-speed tier ($0.30/$0.50 per 1M tokens)

## Implementation Details

### Key Components

1. **`loadPricingData()`** - Loads and parses the JSON pricing file
2. **`estimateCost()`** - Calculates pre-processing cost estimates
3. **`calculateActualCost()`** - Calculates post-processing actual costs
4. **`getProviderAndModel()`** - Parses model strings to extract provider and model name

### Pricing Conversion

The system automatically converts pricing from "per 1M tokens" to "per 1K tokens" for calculations:

- `$10.00 per 1M tokens` → `$0.01 per 1K tokens`
- Special handling for tiered pricing (uses lower tier as default)
- Free models are marked with `$0.00` pricing

### Error Handling

- If the pricing file cannot be loaded, the system falls back to default pricing
- Models with unavailable pricing (marked as -1) show $0.00 cost
- Unknown models use the default model pricing (o3-2025-04-16)

## Updating Pricing

To update pricing:

1. Edit the `AI Model Pricing JSON.json` file in the root directory
2. Copy it to `apps/ui/public/` for frontend access
3. The changes will be reflected immediately on the next batch run

## Testing Model Selection

The batch template demonstrates proper model selection format:

```csv
prompt,model,system,temperature
"Your prompt here",provider/model-name,"Optional system prompt",0.7
```

Each model in the template is tested to ensure it's properly recognized and processed by the batch system.
