import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState } from 'react';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [key, setKey] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Key</DialogTitle>
        </DialogHeader>
        <Input placeholder="sk-..." value={key} onChange={(e) => setKey(e.target.value)} />
        <Button
          className="mt-4 w-full"
          onClick={() => {
            window.api.saveApiKey(key);
            onClose();
          }}
        >
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
