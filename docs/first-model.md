# First Model Guide

Welcome to ABAI Desktop! This guide will walk you through setting up your first AI model in under 5 minutes.

## Prerequisites

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **pnpm** package manager ([Install guide](https://pnpm.io/installation))
- At least one API key from: OpenAI, Anthropic, Grok, or Google Gemini

## Step 1: Clone and Install

Open your terminal and run:

```bash
git clone https://github.com/yourusername/abai-desktop.git
cd abai-desktop
pnpm install
```

![Installation Screenshot](screenshots/install.png)

## Step 2: Start the App

```bash
pnpm dev
```

The app will automatically open. You'll see the main chat interface:

![Main Interface Screenshot](screenshots/main-interface.png)

## Step 3: Add Your API Keys

1. Click **File → Settings** in the menu bar (or press `Ctrl/Cmd + ,`)
2. Enter your API key(s):

   - **OpenAI**: Starts with `sk-...`
   - **Anthropic**: Starts with `sk-ant-...`
   - **Grok**: Starts with `xai-...`
   - **Gemini**: Starts with `AIza...`

3. Click **Save**

![Settings Screenshot](screenshots/settings.png)

✅ Green badges indicate valid keys  
❌ Red badges indicate invalid keys

## Step 4: Select Models

Use the model selector to choose which AI models to query:

- Click the dropdown and select one or more models
- For comparison, select 2 models to see a side-by-side diff view

![Model Selection Screenshot](screenshots/model-select.png)

## Step 5: Start Chatting!

1. Type your prompt in the text area
2. Press **Enter** or click **Send**
3. Watch as responses stream in from your selected models

![Chat Example Screenshot](screenshots/chat-example.png)

## Features

- **Multi-Model Queries**: Send the same prompt to multiple models simultaneously
- **Cost Tracking**: See the cost of each response in real-time
- **Diff View**: Compare responses from 2 models side-by-side
- **Markdown Support**: Responses are rendered with full markdown formatting
- **Session History**: Your chat history is maintained during the session

## Troubleshooting

### "API key not set" error

- Make sure you've saved your keys in Settings
- Check that the key is valid and has credits

### Models not appearing

- Ensure you have the corresponding API key saved
- Some models require specific access (e.g., GPT-4 requires API access)

### App won't start

- Make sure you're using Node.js 18 or higher: `node --version`
- Try deleting `node_modules` and running `pnpm install` again

## Next Steps

- Explore different models and their capabilities
- Use the diff view to compare model outputs
- Check out the [full documentation](../README.md) for advanced features

## Getting Help

- [GitHub Issues](https://github.com/yourusername/abai-desktop/issues)
- [Discord Community](https://discord.gg/abai)
- [Documentation](../README.md)

---

Happy chatting! 🚀
