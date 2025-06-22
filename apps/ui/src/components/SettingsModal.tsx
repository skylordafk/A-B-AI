import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { useTheme, TOKENS } from '../contexts/ThemeContext';

type ProviderId = 'openai' | 'anthropic' | 'grok' | 'gemini';
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [grokKey, setGrokKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [maxWebSearchUses, setMaxWebSearchUses] = useState(5);
  const [enableExtendedThinking, setEnableExtendedThinking] = useState(false);
  const [enablePromptCaching, setEnablePromptCaching] = useState(false);
  const [promptCacheTTL, setPromptCacheTTL] = useState<'5m' | '1h'>('5m');
  const [enableStreaming, setEnableStreaming] = useState(false);

  const [validationStatus, setValidationStatus] = useState<Record<ProviderId, ValidationStatus>>({
    openai: 'idle',
    anthropic: 'idle',
    grok: 'idle',
    gemini: 'idle',
  });

  // Predefined token limit options
  const tokenLimitOptions = [
    { value: 1024, label: '1,024 tokens' },
    { value: 2048, label: '2,048 tokens' },
    { value: 4096, label: '4,096 tokens' },
    { value: 8192, label: '8,192 tokens (default)' },
    { value: 16384, label: '16,384 tokens' },
    { value: 32768, label: '32,768 tokens' },
    { value: 65536, label: '65,536 tokens' },
    { value: 0, label: 'No Limit' },
  ];

  // Load keys and settings when modal opens
  useEffect(() => {
    if (open) {
      // Load API keys
      window.api.getAllKeys().then((keys) => {
        // getAllKeys returns {configured: boolean}, not the actual keys
        // Set placeholder text for configured keys
        setOpenaiKey(keys.openai?.configured ? '••••••••' : '');
        setAnthropicKey(keys.anthropic?.configured ? '••••••••' : '');
        setGrokKey(keys.grok?.configured ? '••••••••' : '');
        setGeminiKey(keys.gemini?.configured ? '••••••••' : '');

        // Validate existing keys
        Object.entries(keys).forEach(([provider, keyInfo]) => {
          if (keyInfo?.configured) {
            validateKey(provider as ProviderId);
          }
        });
      });

      // Load max output tokens setting
      window.api.getMaxOutputTokens().then((tokens) => {
        setMaxOutputTokens(tokens);
      });

      // Load web search settings
      window.api.getEnableWebSearch().then((enabled) => {
        setEnableWebSearch(enabled);
      });
      window.api.getMaxWebSearchUses().then((uses) => {
        setMaxWebSearchUses(uses);
      });

      // Load extended thinking setting
      window.api.getEnableExtendedThinking().then((enabled) => {
        setEnableExtendedThinking(enabled);
      });

      // Load prompt caching settings
      window.api.getEnablePromptCaching().then((enabled) => {
        setEnablePromptCaching(enabled);
      });
      window.api.getPromptCacheTTL().then((ttl) => {
        setPromptCacheTTL(ttl);
      });

      // Load streaming setting
      window.api.getEnableStreaming().then((enabled) => {
        setEnableStreaming(enabled);
      });
    }
  }, [open]);

  // Listen for invalid key events
  useEffect(() => {
    const handleInvalidKey = (providerId: string) => {
      setValidationStatus((prev) => ({
        ...prev,
        [providerId]: 'invalid',
      }));
    };

    const cleanup = window.ipc.onInvalidKey(handleInvalidKey);

    // Cleanup listener when component unmounts or modal closes
    return cleanup;
  }, []);

  const validateKey = async (provider: ProviderId) => {
    setValidationStatus((prev) => ({ ...prev, [provider]: 'validating' }));

    try {
      const isValid = await window.api.validateKey(provider);
      setValidationStatus((prev) => ({ ...prev, [provider]: isValid ? 'valid' : 'invalid' }));
    } catch {
      setValidationStatus((prev) => ({ ...prev, [provider]: 'invalid' }));
    }
  };

  const handleSave = async () => {
    const keys: Record<ProviderId, string> = {
      openai: openaiKey,
      anthropic: anthropicKey,
      grok: grokKey,
      gemini: geminiKey,
    };

    // Save all keys (only if they've been changed, not masked)
    await Promise.all(
      Object.entries(keys).map(([provider, key]) => {
        if (key && !key.includes('•')) {
          return window.api.saveApiKeyForProvider(provider as ProviderId, key);
        }
      })
    );

    // Save max output tokens setting
    await window.api.setMaxOutputTokens(maxOutputTokens);

    // Save web search settings
    await window.api.setEnableWebSearch(enableWebSearch);
    await window.api.setMaxWebSearchUses(maxWebSearchUses);

    // Save extended thinking setting
    await window.api.setEnableExtendedThinking(enableExtendedThinking);

    // Save prompt caching settings
    await window.api.setEnablePromptCaching(enablePromptCaching);
    await window.api.setPromptCacheTTL(promptCacheTTL);

    // Save streaming setting
    await window.api.setEnableStreaming(enableStreaming);

    // Validate all saved keys (only if they've been changed, not masked)
    await Promise.all(
      Object.entries(keys).map(([provider, key]) => {
        if (key && !key.includes('•')) {
          return validateKey(provider as ProviderId);
        }
      })
    );

    onClose();
  };

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'validating':
        return <span className="text-xs text-blue-500">Validating...</span>;
      case 'valid':
        return <span className="text-xs text-green-500">✅ Valid</span>;
      case 'invalid':
        return <span className="text-xs text-red-500">❌ Invalid</span>;
      default:
        return null;
    }
  };

  // Theme context helpers
  const { mode, toggleMode, presetName, setPresetName, presets, updateToken, savePresetAs } =
    useTheme();

  const [newPresetName, setNewPresetName] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <div className="overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* ------------------- API KEYS SECTION ------------------- */}
            <div>
              <h2 className="text-sm font-semibold mb-1.5">API Keys</h2>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    {getStatusBadge(validationStatus.openai)}
                  </div>
                  <Input
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="mt-1"
                    type="password"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Anthropic API Key</label>
                    {getStatusBadge(validationStatus.anthropic)}
                  </div>
                  <Input
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="mt-1"
                    type="password"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Grok API Key</label>
                    {getStatusBadge(validationStatus.grok)}
                  </div>
                  <Input
                    placeholder="xai-..."
                    value={grokKey}
                    onChange={(e) => setGrokKey(e.target.value)}
                    className="mt-1"
                    type="password"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Gemini API Key</label>
                    {getStatusBadge(validationStatus.gemini)}
                  </div>
                  <Input
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="mt-1"
                    type="password"
                  />
                </div>
              </div>
              <Button
                className="mt-2 w-full !bg-[var(--bg-primary)] !text-[var(--text-primary)] hover:!bg-[var(--bg-secondary)] border border-[var(--border)]"
                onClick={handleSave}
              >
                Save Settings
              </Button>
            </div>

            {/* ------------------- OUTPUT LIMITS SECTION ------------------- */}
            <div>
              <h2 className="text-sm font-semibold mb-1.5">Output Limits</h2>
              <div>
                <label className="text-sm font-medium block mb-1">Maximum Output Tokens</label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                    min="0"
                    max="32000"
                    placeholder="Enter token limit (0 for no limit)"
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-1">
                    {tokenLimitOptions.map((option) => (
                      <Button
                        key={option.value}
                        onClick={() => setMaxOutputTokens(option.value)}
                        className={`text-xs px-2 py-1 h-auto border ${
                          maxOutputTokens === option.value
                            ? '!bg-blue-500 !text-white border-blue-500'
                            : '!bg-[var(--bg-secondary)] !text-[var(--text-secondary)] hover:!bg-[var(--bg-primary)] border-[var(--border)]'
                        }`}
                      >
                        {option.value === 0 ? 'No Limit' : `${option.value.toLocaleString()}`}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {maxOutputTokens === 0
                    ? 'No limit - model-specific maximums will be used (32K for Claude 4, 8K for others)'
                    : `Responses will be limited to ${maxOutputTokens.toLocaleString()} tokens (capped at model maximums)`}
                </p>
              </div>
            </div>

            {/* ------------------- CLAUDE FEATURES SECTION ------------------- */}
            <div>
              <h2 className="text-sm font-semibold mb-1.5">Claude Features</h2>
              <div className="space-y-3">
                {/* Extended Thinking */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">Extended Thinking</label>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Enable extended thinking for supported Claude models (Opus 4, Sonnet 4, 3.5
                      Sonnet)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={enableExtendedThinking}
                      onChange={(e) => setEnableExtendedThinking(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Web Search */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">Web Search</label>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Enable web search tool for supported Claude models (Opus 4, Sonnet 4, 3.7
                      Sonnet, 3.5 Sonnet/Haiku)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={enableWebSearch}
                      onChange={(e) => setEnableWebSearch(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Max Web Search Uses */}
                {enableWebSearch && (
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Maximum Web Searches per Request
                    </label>
                    <select
                      value={maxWebSearchUses}
                      onChange={(e) => setMaxWebSearchUses(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 search</option>
                      <option value={3}>3 searches</option>
                      <option value={5}>5 searches (default)</option>
                      <option value={10}>10 searches</option>
                      <option value={15}>15 searches</option>
                    </select>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Web search costs $10 per 1,000 searches. More searches allow for more
                      comprehensive research.
                    </p>
                  </div>
                )}

                {/* Prompt Caching */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">Prompt Caching</label>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Cache repeated content to reduce costs by up to 90%. Cache hits cost only 10%
                      of regular tokens.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={enablePromptCaching}
                      onChange={(e) => setEnablePromptCaching(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Cache TTL */}
                {enablePromptCaching && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Cache Duration</label>
                    <select
                      value={promptCacheTTL}
                      onChange={(e) => setPromptCacheTTL(e.target.value as '5m' | '1h')}
                      className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="5m">5 minutes (cheaper writes)</option>
                      <option value="1h">1 hour (better for batches)</option>
                    </select>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      5-minute cache writes cost 125% of base tokens. 1-hour cache writes cost 200%
                      but last longer.
                    </p>
                  </div>
                )}

                {/* Streaming */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">Streaming Responses</label>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Show real-time responses as they generate during batch processing.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={enableStreaming}
                      onChange={(e) => setEnableStreaming(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* ------------------- THEME SECTION ------------------- */}
            <div>
              <h2 className="text-sm font-semibold mb-1.5">Theme</h2>

              {/* Preset selection */}
              <div className="mb-2">
                <label className="text-sm font-medium mr-2">Preset:</label>
                <select
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] px-1.5 py-0.5 rounded-sm text-sm"
                >
                  {Object.keys(presets).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <Button
                  className="ml-2 px-2 py-1 text-sm !bg-[var(--bg-primary)] !text-[var(--text-primary)] hover:!bg-[var(--bg-secondary)] border border-[var(--border)]"
                  onClick={toggleMode}
                >
                  {mode === 'light' ? 'Switch to dark' : 'Switch to light'} mode
                </Button>
              </div>

              {/* Tokens editor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOKENS.map((token) => (
                  <div key={token} className="flex items-center justify-between gap-2">
                    <label className="text-sm" htmlFor={token}>
                      {token}
                    </label>
                    <input
                      id={token}
                      type="color"
                      value={presets[presetName][mode][token]}
                      onChange={(e) => updateToken(token, e.target.value)}
                      className="w-10 h-6 p-0 border border-[var(--border)] rounded"
                    />
                  </div>
                ))}
              </div>

              {/* Save as new preset */}
              <div className="mt-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium">Save current as new preset</label>
                  <Input
                    placeholder="Preset name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="mt-1 !bg-[var(--bg-primary)] !text-[var(--text-primary)] hover:!bg-[var(--bg-secondary)] border border-[var(--border)]"
                  onClick={() => {
                    savePresetAs(newPresetName.trim());
                    setNewPresetName('');
                  }}
                  disabled={!newPresetName.trim() || !!presets[newPresetName.trim()]}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
