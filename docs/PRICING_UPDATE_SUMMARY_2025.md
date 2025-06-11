# Pricing and Model Update Summary - January 2025

## Updates Made

### 1. Model Changes

- **Removed**: `gemini/models/gemini-1.5-flash-fast`
- **Added**: `gemini/models/gemini-2.5-flash-preview`

### 2. Pricing Updates

#### OpenAI

- **o3-2025-04-16**: $10/$40 → $2/$8 per 1M tokens
- **gpt-4.1-mini**: Free → $0.40/$1.60 per 1M tokens

#### Anthropic

- **claude-opus-4-20250514**: No change ($15/$75 per 1M tokens)
- **claude-3-haiku**: $0.25/$0.25 → $0.80/$4.00 per 1M tokens

#### Grok

- **grok-3**: -1/-1 → $3/$15 per 1M tokens
- **grok-3-mini**: -1/-1 → $0.30/$0.50 per 1M tokens

#### Gemini

- **gemini-2.5-pro-thinking**: $0.80/$0.80 → $1.25/$10 per 1M tokens
- **gemini-2.5-flash-preview**: New model at $0.35/$1.75 per 1M tokens

## Files Updated

### Core Files

1. `modelPricing.json` - Structured pricing data
2. `AI Model Pricing JSON.json` - Human-readable pricing
3. `apps/ui/public/AI Model Pricing JSON.json` - Frontend copy

### Provider Files

1. `apps/main/src/providers/gemini.ts` - Updated model list and pricing

### UI Components

1. `apps/ui/src/components/ModelSelect.tsx` - Updated model list
2. `apps/ui/src/lib/batch/loadPricingData.ts` - Updated model mapping
3. `apps/ui/src/ChatPage.tsx` - Updated model mapping

### Documentation

1. `docs/pricing-system.md` - Updated model list
2. `docs/batch.md` - Updated model list
3. `docs/MODEL_PRICING_UPDATE_PROCESS.md` - Created comprehensive update guide

### Templates

1. `apps/ui/public/batch-template.csv` - Updated example
2. `docs/batch-template.csv` - Updated example

### Tests

1. `tests/providers/geminiProvider.test.ts` - Updated for new model
2. `tests/batch/pricingIntegration.test.ts` - Updated test data and expectations

## Verification

All tests pass successfully:

- ✓ Gemini Provider tests
- ✓ Pricing Integration tests
- ✓ Pricing Manifest tests

## Next Steps

To make future updates, follow the process documented in `docs/MODEL_PRICING_UPDATE_PROCESS.md`
