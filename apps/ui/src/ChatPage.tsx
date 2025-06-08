import { useState, useEffect } from 'react';
import { Textarea } from './components/ui/textarea';
import { Button } from './components/ui/button';
import SettingsModal from './components/SettingsModal';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  cost?: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    window.ipc.onOpenSettings(() => setSettingsOpen(true));
  }, []);

  const send = async () => {
    if (!prompt.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: prompt }]);
    const res = await window.api.sendPrompt(prompt).catch((err) => {
      if (err.message.includes('API key')) setSettingsOpen(true);
      return null;
    });
    if (res) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: res.answer,
          cost: res.costUSD,
        },
      ]);
    }
    setPrompt('');
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-2">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.cost !== undefined && (
              <p className="text-xs text-gray-400">Tokens cost: ${m.cost.toFixed(4)}</p>
            )}
          </div>
        ))}
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
        placeholder="Ask something…"
        className="resize-none"
      />
      <Button onClick={send} className="mt-2">
        Send
      </Button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
