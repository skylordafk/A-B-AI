import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState } from 'react';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  const handleSave = async () => {
    if (openaiKey) {
      await window.api.saveApiKeyForProvider('openai', openaiKey);
    }
    if (anthropicKey) {
      await window.api.saveApiKeyForProvider('anthropic', anthropicKey);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">OpenAI API Key</label>
            <Input
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Anthropic API Key</label>
            <Input
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="mt-1"
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
