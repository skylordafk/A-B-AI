# A-B-AI Usage Guide

## Setting up API Keys

1. Open the application
2. Go to **File → Settings** or wait for the prompt when sending a message
3. Enter your API keys for the providers you want to use:
   - **OpenAI**: Get from https://platform.openai.com/api-keys
   - **Anthropic**: Get from https://console.anthropic.com/
   - **Grok**: Get from https://x.ai/api (requires X Premium+ subscription)
   - **Gemini**: Get from https://aistudio.google.com/app/apikey

## Using Multiple Models

The new ModelSelect component allows you to:

1. **Select Multiple Models**: Check any combination of models from different providers
2. **Compare Responses**: When 2 models are selected, responses are shown in a diff view
3. **See Costs**: Each response shows the estimated cost based on token usage

### Available Models

**OpenAI:**

- OpenAI o3 (Premium reasoning model)
- GPT-4.1 Mini (Fast tier)

**Anthropic:**

- Claude Opus 4 (Premium reasoning model)
- Claude 3 Haiku (Fast tier)

**Grok:**

- Grok 3 (Latest model, flat pricing)
- Grok 3 Mini (Fast tier, flat pricing)

**Gemini:**

- Gemini 2.5 Pro-Thinking (Premium reasoning)
- Gemini 1.5 Flash-Fast (Fast tier)

## Tips

- For quick responses, use the "fast" tier models (marked with "(fast)" badge)
- For complex reasoning, use the premium models
- Compare different models by selecting exactly 2 models
- The diff view highlights differences in responses
