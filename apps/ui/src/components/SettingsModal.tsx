import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
        <Button className="mt-4 w-full" onClick={handleSave}>
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
