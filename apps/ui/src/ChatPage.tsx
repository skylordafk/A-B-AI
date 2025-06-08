import { useState, useEffect } from 'react';
import { Textarea } from './components/ui/textarea';
import { Button } from './components/ui/button';
import SettingsModal from './components/SettingsModal';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  cost?: number;
  provider?: string;
  answer?: string;
  costUSD?: number;
}

const MODELS = [
  { id: 'openai', label: 'OpenAI o3' },
  { id: 'anthropic', label: 'Claude Opus 4' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(['openai']);

  useEffect(() => {
    window.ipc.onOpenSettings(() => setSettingsOpen(true));
  }, []);

  const send = async () => {
    if (!prompt.trim() || selected.length === 0) return;

    setMessages((m) => [...m, { role: 'user', content: prompt }]);

    // Use multi-model endpoint
    try {
      const results = await window.api.sendPrompts(prompt, selected as ('openai' | 'anthropic')[]);
      setMessages((m) => [
        ...m,
        ...results.map((r) => ({
          role: 'assistant' as const,
          content: r.answer,
          cost: r.costUSD,
          provider: r.provider,
          answer: r.answer,
          costUSD: r.costUSD,
        })),
      ]);
    } catch (err: any) {
      if (err.message.includes('API key')) setSettingsOpen(true);
    }

    setPrompt('');
  };

  const lastTwoAssistantMsgs = messages.filter((m) => m.role === 'assistant').slice(-2);
  const shouldShowDiff = selected.length === 2 && lastTwoAssistantMsgs.length === 2;

  return (
    <div className="flex flex-col h-screen p-4 gap-2">
      <div className="flex gap-4 items-center mb-2">
        {MODELS.map((m) => (
          <label key={m.id} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() =>
                setSelected((s) => (s.includes(m.id) ? s.filter((i) => i !== m.id) : [...s, m.id]))
              }
              className="cursor-pointer"
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {shouldShowDiff ? (
          <>
            {messages
              .filter((m) => m.role === 'user')
              .map((m, i) => (
                <div key={`user-${i}`} className="text-right">
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            <div className="border rounded p-4">
              <div className="flex justify-between mb-2 text-sm text-gray-600">
                <span>
                  {lastTwoAssistantMsgs[0].provider} - Cost: $
                  {lastTwoAssistantMsgs[0].costUSD?.toFixed(4)}
                </span>
                <span>
                  {lastTwoAssistantMsgs[1].provider} - Cost: $
                  {lastTwoAssistantMsgs[1].costUSD?.toFixed(4)}
                </span>
              </div>
              <ReactDiffViewer
                oldValue={lastTwoAssistantMsgs[0].answer || ''}
                newValue={lastTwoAssistantMsgs[1].answer || ''}
                splitView={true}
                hideLineNumbers={true}
                styles={{
                  diffContainer: {
                    fontSize: '14px',
                  },
                }}
              />
            </div>
          </>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              {m.provider && <p className="text-xs text-gray-500 mb-1">{m.provider}</p>}
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.cost !== undefined && (
                <p className="text-xs text-gray-400">Cost: ${m.cost.toFixed(4)}</p>
              )}
            </div>
          ))
        )}
      </div>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
        placeholder="Ask something…"
        className="resize-none"
      />
      <Button onClick={send} className="mt-2" disabled={selected.length === 0}>
        Send {selected.length > 1 ? `to ${selected.length} models` : ''}
      </Button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
