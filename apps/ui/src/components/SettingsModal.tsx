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

  const [validationStatus, setValidationStatus] = useState<Record<ProviderId, ValidationStatus>>({
    openai: 'idle',
    anthropic: 'idle',
    grok: 'idle',
    gemini: 'idle',
  });

  // Load keys when modal opens
  useEffect(() => {
    if (open) {
      window.api.getAllKeys().then((keys) => {
        setOpenaiKey(keys.openai || '');
        setAnthropicKey(keys.anthropic || '');
        setGrokKey(keys.grok || '');
        setGeminiKey(keys.gemini || '');

        // Validate existing keys
        Object.entries(keys).forEach(([provider, key]) => {
          if (key) {
            validateKey(provider as ProviderId);
          }
        });
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

    window.ipc.onInvalidKey(handleInvalidKey);
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

    // Save all keys
    await Promise.all(
      Object.entries(keys).map(([provider, key]) => {
        if (key) {
          return window.api.saveApiKeyForProvider(provider as ProviderId, key);
        }
      })
    );

    // Validate all saved keys
    await Promise.all(
      Object.entries(keys).map(([provider, key]) => {
        if (key) {
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
                Save Keys
              </Button>
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
