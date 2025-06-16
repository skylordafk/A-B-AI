# Batch Prompting Documentation

## Overview

The Batch Prompting feature in A-B/AI allows you to process multiple prompts sequentially or in parallel, with automatic cost estimation, progress tracking, and result export capabilities.

## Getting Started

1. Navigate to the Batch tab from the Chat page (click the dropdown arrow next to "Send" and select "Open Batch Prompting...")
2. Upload a CSV or JSON file containing your prompts
3. Review the cost estimation
4. Click "Run Batch" to start processing

## File Format

### CSV Format

Your CSV file must include the following columns:

- `prompt` (required): The prompt text to send
- `model` (optional): The model to use (e.g., "openai/gpt-4.1-mini")
- `system` (optional): System prompt for context
- `temperature` (optional): Temperature setting (0-2)

Example:

```csv
prompt,model,system,temperature
"What is AI?",openai/gpt-4.1-mini,"You are a helpful assistant",0.7
"Explain machine learning",anthropic/claude-3-haiku,,0.5
```

### JSON Format

```json
[
  {
    "prompt": "What is AI?",
    "model": "openai/gpt-4.1-mini",
    "system": "You are a helpful assistant",
    "temperature": 0.7
  },
  {
    "prompt": "Explain machine learning",
    "model": "anthropic/claude-3-haiku",
    "temperature": 0.5
  }
]
```

## Features

### Cost Estimation

Before running your batch, the system will:

- Tokenize each prompt to estimate input tokens (includes system prompts)
- Load pricing data from `AI Model Pricing JSON.json`
- Calculate input token costs based on current model pricing
- Display input token count and cost for each row

Note: Only input tokens are calculated during dry-run. Total costs (including output tokens) are calculated after processing when actual response lengths are known.

### Concurrency Control

- Adjust the concurrency slider (1-10) to control how many prompts are processed simultaneously
- Higher concurrency = faster processing but may hit rate limits
- Default: 3 concurrent requests

### Progress Tracking

- Real-time progress bar showing completion percentage
- ETA calculation based on average processing time
- Individual row status updates (success/error)

### Error Handling

The system handles various error types:

- `error-missing-key`: API key not configured for the provider
- `error-api`: API returned an error (4xx/5xx)
- `error`: General processing error

Failed rows are marked but don't stop the batch processing.

## Output Files

### Results CSV

Contains all processing results:

- All original columns from input
- `status`: Processing status
- `response`: AI model response
- `tokens_in`/`tokens_out`: Token usage
- `cost_usd`: Actual cost
- `latency_ms`: Response time
- `error`: Error message if failed

### Job Manifest (.abaijob)

A detailed JSON file containing:

- Input file reference
- Processing settings (concurrency, etc.)
- Summary statistics
- Individual row results with cost and timing

## Best Practices

1. **Start Small**: Test with a few rows first to ensure your format is correct
2. **Use Templates**: Download the sample template as a starting point
3. **Monitor Costs**: Review the cost estimation before running large batches
4. **Set Appropriate Concurrency**: Balance speed vs. rate limits
5. **Handle Errors**: Check the results for failed rows and re-run if needed

## Supported Models

The batch processor supports all models available in A-B/AI. Use the following format in your CSV/JSON:

**OpenAI:**

- `openai/o3-2025-04-16` - Advanced reasoning model
- `openai/gpt-4.1-mini` - Free model with unlimited access

**Anthropic:**

- `anthropic/claude-opus-4-20250514` - Advanced reasoning model
- `anthropic/claude-3-haiku` - Fast, cost-effective model

**Google Gemini:**

- `gemini/models/gemini-2.5-pro-thinking` - Thinking model with tiered pricing
- `gemini/models/gemini-2.5-flash-preview` - Fast and efficient Gemini model

**Grok:**

- `grok/grok-3` - Latest high-end model
- `grok/grok-3-mini` - Low-cost, high-speed tier

If no model is specified, the default (`openai/o3-2025-04-16`) will be used.

See the sample template for examples of each model in use.

## Using Templates

A-B/AI provides a template system to help you get started quickly. Templates are CSV files with pre-configured prompts, models, and settings for common use-cases.

### Accessing Templates

1. **Browse Templates**: Click "Browse Templates" in the batch processing interface
2. **Template Categories**: Templates are organized by category:
   - **General**: Basic starter templates
   - **Creative**: Creative writing and content generation
   - **Analysis**: Data analysis and interpretation
   - **Development**: Code review and programming assistance
   - **Research**: Academic and research analysis

### Using Templates

**Load Template**: Click on any template card to load it directly into the batch processor. This will populate your CSV data with the template's prompts and settings.

**Download Template**: Hover over a template card and click the "Download" button to save the template CSV file to your local device. This allows you to:

- Modify the template offline
- Use it as a starting point for your own templates
- Keep local copies for future use

**Download All Templates**: Use the "Download All" button in the template browser to download all available templates at once.

### Template Structure

Templates follow the standard CSV format:

```csv
prompt,model,system,temperature
"Your prompt text here",openai/gpt-4o-mini,"System message",0.5
```

### Available Models

Templates use various AI models optimized for different tasks:

**OpenAI:**

- `openai/o3-2025-04-16` - Latest reasoning model (default)
- `openai/gpt-4o-mini` - Cost-effective, fast model
- `openai/gpt-4.1-turbo` - Enhanced GPT-4 model

**Anthropic:**

- `anthropic/claude-3-haiku` - Fast, cost-effective model
- `anthropic/claude-opus-4-20250514` - High-capability model for complex tasks

**Google:**

- `gemini/models/gemini-2.5-pro-thinking` - Advanced reasoning model
- `gemini/models/gemini-2.5-flash-preview` - Fast and efficient Gemini model

**Grok:**

- `grok/grok-3` - Latest high-end model
- `grok/grok-3-mini` - Low-cost, high-speed tier

If no model is specified, the default (`openai/o3-2025-04-16`) will be used.

See the sample template for examples of each model in use.

### 🧩 Template Variables (`{{var}}`)

You can reference any column in your CSV/JSON by wrapping its name in double curly braces.

Example CSV row:

```csv
prompt,model,temperature,variable1,variable2
"What are the best {{variable1}} to do in {{variable2}}?",gpt-4o,0.7,activities,Japan
```

ABAI substitutes `{{variable1}} → activities` and `{{variable2}} → Japan`.  
If a variable is missing or empty, that row fails with  
`Missing values for: <var>` and is highlighted in the results table.

_Future roadmap_: optional advanced templating (`{{#if}}`, `{{#each}}`) behind an "Advanced Mode" toggle.
