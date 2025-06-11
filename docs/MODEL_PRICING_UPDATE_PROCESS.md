# Model and Pricing Update Process

This document outlines the complete process for updating AI models and their pricing in the A-B/AI application.

## Overview

Model and pricing information is stored in multiple locations throughout the codebase. This guide ensures all locations are updated consistently.

## Files to Update

### 1. Core Pricing Files

#### `AI Model Pricing JSON.json` (Root Directory)

- **Purpose**: Source of truth for pricing information
- **Format**: Human-readable format with prices per 1M tokens
- **Example**:

```json
{
  "OpenAI": {
    "model-name": {
      "input_price": "$X.XX per 1M tokens",
      "output_price": "$Y.YY per 1M tokens"
    }
  }
}
```

#### `modelPricing.json` (Root Directory)

- **Purpose**: Structured pricing data used by the application
- **Format**: Machine-readable format with prices per 1M tokens (as numbers)
- **Example**:

```json
{
  "openai": {
    "model-name": { "prompt": 2.0, "completion": 8.0 }
  }
}
```

#### `apps/ui/public/AI Model Pricing JSON.json`

- **Purpose**: Frontend copy of the main pricing file
- **Action**: Copy from root `AI Model Pricing JSON.json`
- **Command**: `Copy-Item "AI Model Pricing JSON.json" -Destination "apps\ui\public\AI Model Pricing JSON.json" -Force`

### 2. Provider Files

#### `apps/main/src/providers/[provider].ts`

For each provider (openai, anthropic, gemini, grok):

1. Update the `MODELS` array with new model information
2. Update pricing in model metadata (prices per 1K tokens)
3. For Gemini: Update `MODEL_PRICING` map and model selection logic

**Example for Gemini**:

```typescript
private readonly MODELS: ModelMeta[] = [
  {
    id: 'models/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash-Preview',
    description: 'Fast and efficient Gemini model.',
    contextSize: 1_000_000,
    pricePrompt: 0.00035,  // Per 1K tokens
    priceCompletion: 0.00175,  // Per 1K tokens
  },
];
```

### 3. UI Components

#### `apps/ui/src/components/ModelSelect.tsx`

- Update the `AVAILABLE_MODELS` array
- Ensure pricing matches (per 1K tokens)

#### `apps/ui/src/lib/batch/loadPricingData.ts`

- Update the Gemini model mapping if changing Gemini models
- Update the default pricing fallback

### 4. Test Files

#### `tests/providers/[provider]Provider.test.ts`

- Update model expectations in tests
- Update pricing assertions

#### `tests/batch/pricingIntegration.test.ts`

- Update pricing expectations
- Update cost calculation test cases

#### `tests/pricingManifest.test.ts`

- No changes needed (tests automatically validate against pricing files)

## Step-by-Step Process

### When Updating Pricing Only

1. Update `AI Model Pricing JSON.json` with new prices
2. Update `modelPricing.json` with corresponding numeric values
3. Copy to UI: `Copy-Item "AI Model Pricing JSON.json" -Destination "apps\ui\public\AI Model Pricing JSON.json" -Force`
4. Update provider files if they have hardcoded pricing
5. Update `ModelSelect.tsx` pricing values
6. Update test expectations in `pricingIntegration.test.ts`
7. Run tests: `pnpm test`

### When Adding/Removing Models

1. Follow all pricing update steps above
2. Update provider's `MODELS` array
3. For Gemini: Update model mapping logic in `chat()` method
4. Update `ModelSelect.tsx` model list
5. Update `loadPricingData.ts` for Gemini model mapping
6. Update provider tests for new/removed models
7. Update any documentation mentioning supported models
8. Run tests: `pnpm test`

## Pricing Conversion Reference

- **Per 1M tokens → Per 1K tokens**: Divide by 1000
  - Example: $2.00 per 1M = $0.002 per 1K
- **Per 1K tokens → Per 1M tokens**: Multiply by 1000
  - Example: $0.002 per 1K = $2.00 per 1M

## Validation Checklist

After making updates, verify:

- [ ] All pricing files have consistent values
- [ ] Provider files use correct per-1K pricing
- [ ] UI shows correct model names and pricing
- [ ] Tests pass: `pnpm test`
- [ ] Batch processing calculates costs correctly
- [ ] Model selection in UI works for all models

## Common Issues

1. **Pricing Mismatch**: Ensure you're using the correct unit (per 1K vs per 1M)
2. **Gemini Models**: Remember to update both the model list AND the mapping logic
3. **Test Failures**: Update test expectations to match new pricing
4. **UI Not Updating**: Ensure you copied the pricing file to `apps/ui/public/`

## Notes

- The system automatically handles tiered pricing by using the lower tier as default
- Models marked with -1 pricing are treated as unavailable
- Free models should have 0 pricing values
- Always test batch processing after updates to ensure cost calculations work
