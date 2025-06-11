import { useState, useEffect, useMemo } from 'react';
import { Textarea } from './components/ui/textarea';
import { Button } from './components/ui/button';
import SettingsModal from './components/SettingsModal';
import ModelSelect from './components/ModelSelect';
import ReactDiffViewer from 'react-diff-viewer-continued';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mergeAdjacentCodeFences from './lib/markdown';
import LoadingOverlay from './components/LoadingOverlay';
import ChatSidebar from './components/ChatSidebar';
import { useChat } from './contexts/ChatContext';
import TerminalBlock from './components/TerminalBlock';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './contexts/ThemeContext';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Copy button component
const CopyButton = ({ text, className = '' }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded border border-slate-600 transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
};

// Component to display two assistant messages with optional comparison & diff view
const AssistantComparison = ({ assistantMessages }: { assistantMessages: any[] }) => {
  const { mode } = useTheme();
  const [sideBySide, setSideBySide] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  // Helpers to render the two answers inside TerminalBlock
  const renderAnswers = () => (
    <div className={`grid gap-4 ${sideBySide ? 'md:grid-cols-2 grid-cols-1' : 'grid-cols-1'}`}>
      {assistantMessages.map((msg, idx) => (
        <div key={idx} className="max-w-full">
          <div className="flex items-center gap-2 mb-1">
            {msg.provider && (
              <p className="text-xs text-stone-500 dark:text-stone-300 ml-1">{msg.provider}</p>
            )}
            <CopyButton text={msg.answer || msg.content} />
          </div>
          <TerminalBlock>
            <div className="prose prose-sm max-w-none prose-stone">
              <ReactMarkdown remarkPlugins={[remarkGfm, mergeAdjacentCodeFences]}>
                {msg.answer || msg.content}
              </ReactMarkdown>
            </div>
          </TerminalBlock>
          {msg.costUSD !== undefined && (
            <p className="text-xs text-stone-400 dark:text-stone-300 mt-1 ml-1">
              Cost: ${msg.costUSD.toFixed(4)}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  const renderDiff = () => (
    <>
      <div className="flex justify-between mb-2 text-sm text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-2">
          <span>
            {assistantMessages[0].provider} - Cost: ${assistantMessages[0].costUSD?.toFixed(4)}
          </span>
          <CopyButton text={assistantMessages[0].answer || assistantMessages[0].content} />
        </div>
        <div className="flex items-center gap-2">
          <span>
            {assistantMessages[1].provider} - Cost: ${assistantMessages[1].costUSD?.toFixed(4)}
          </span>
          <CopyButton text={assistantMessages[1].answer || assistantMessages[1].content} />
        </div>
      </div>
      <ReactDiffViewer
        oldValue={assistantMessages[0].answer || assistantMessages[0].content}
        newValue={assistantMessages[1].answer || assistantMessages[1].content}
        splitView={true}
        hideLineNumbers={true}
        useDarkTheme={mode === 'dark'}
        styles={
          mode === 'light'
            ? {
                variables: {
                  light: {
                    diffViewerBackground: '#fafaf9',
                    diffViewerColor: '#1c1917',
                    addedBackground: '#dcfce7',
                    addedColor: '#166534',
                    removedBackground: '#fee2e2',
                    removedColor: '#991b1b',
                    wordAddedBackground: '#bbf7d0',
                    wordRemovedBackground: '#fecaca',
                    addedGutterBackground: '#d1fae5',
                    removedGutterBackground: '#fed7d7',
                    gutterBackground: '#f5f5f4',
                    gutterBackgroundDark: '#e7e5e4',
                    highlightBackground: '#fef3c7',
                    highlightGutterBackground: '#fde68a',
                    codeFoldGutterBackground: '#e0e7ff',
                    codeFoldBackground: '#f0f9ff',
                    emptyLineBackground: '#fafaf9',
                    gutterColor: '#57534e',
                    addedGutterColor: '#57534e',
                    removedGutterColor: '#57534e',
                    codeFoldContentColor: '#57534e',
                    diffViewerTitleBackground: '#f5f5f4',
                    diffViewerTitleColor: '#1c1917',
                    diffViewerTitleBorderColor: '#d6d3d1',
                  },
                },
                diffContainer: {
                  fontSize: '14px',
                  backgroundColor: '#fafaf9 !important',
                  color: '#1c1917 !important',
                },
                diffRemoved: {
                  backgroundColor: '#fee2e2 !important',
                  color: '#991b1b !important',
                },
                diffAdded: {
                  backgroundColor: '#dcfce7 !important',
                  color: '#166534 !important',
                },
                lineNumber: {
                  color: '#57534e !important',
                  backgroundColor: '#f5f5f4 !important',
                },
                gutter: {
                  backgroundColor: '#f5f5f4 !important',
                  color: '#57534e !important',
                },
                line: {
                  '&:hover': {
                    backgroundColor: '#f5f5f4 !important',
                  },
                },
                contentText: {
                  color: '#1c1917 !important',
                },
              }
            : undefined
        }
      />
    </>
  );

  return (
    <div className="border border-stone-300 dark:border-stone-600 rounded-lg p-4 bg-stone-200 dark:bg-stone-700 relative">
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={() => setSideBySide(!sideBySide)}
          className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white border border-slate-600 rounded transition-colors"
        >
          {sideBySide ? 'Single column' : 'Compare side-by-side'}
        </button>
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white border border-slate-600 rounded transition-colors"
        >
          {showDiff ? 'Hide diff' : 'Show diff'}
        </button>
      </div>
      {showDiff ? renderDiff() : renderAnswers()}
    </div>
  );
};

// Collapsible conversation round component
const ConversationRound = ({
  userMessage,
  assistantMessages,
  roundIndex,
  isLatest = false,
}: {
  userMessage: any;
  assistantMessages: any[];
  roundIndex: number;
  isLatest?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(isLatest);

  return (
    <div className="border border-stone-200 rounded-lg mb-4 bg-stone-50 dark:bg-stone-800 dark:border-stone-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left flex items-center justify-between bg-stone-50 dark:bg-stone-700 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors text-stone-900 dark:text-stone-50"
      >
        <div className="flex-1">
          <div className="font-medium text-stone-900 dark:text-stone-50 text-sm">
            Round {roundIndex + 1}: {userMessage.content.substring(0, 60)}
            {userMessage.content.length > 60 ? '...' : ''}
          </div>
          <div className="text-xs text-stone-700 dark:text-stone-400 mt-1">
            {assistantMessages.length} response{assistantMessages.length !== 1 ? 's' : ''}
          </div>
        </div>
        <svg
          className={`w-4 h-4 transition-transform text-stone-900 dark:text-stone-50 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-stone-200 p-4 space-y-4">
          {/* User message */}
          <div className="text-right">
            <div className="inline-block max-w-3xl p-3 bg-slate-600 text-white rounded-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm, mergeAdjacentCodeFences]}>
                {userMessage.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Assistant responses */}
          {assistantMessages.length === 2 ? (
            <AssistantComparison assistantMessages={assistantMessages} />
          ) : (
            assistantMessages.map((msg, idx) => (
              <div key={idx} className="max-w-4xl">
                <div className="flex items-center gap-2 mb-1">
                  {msg.provider && (
                    <p className="text-xs text-stone-500 dark:text-stone-300 ml-1">
                      {msg.provider}
                    </p>
                  )}
                  <CopyButton text={msg.content} />
                </div>
                <div
                  className="inline-block p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg relative text-stone-900 dark:text-stone-50"
                  style={{ userSelect: 'text' }}
                >
                  <div className="prose prose-sm max-w-none prose-stone">
                    <ReactMarkdown remarkPlugins={[remarkGfm, mergeAdjacentCodeFences]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
                {msg.cost !== undefined && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 ml-1">
                    Cost: ${msg.cost.toFixed(4)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function ChatPage() {
  const { currentChat, pushMessage, pushMessages, createNewChat } = useChat();
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invalidKeyError, setInvalidKeyError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Debounced prompt for performance
  const debouncedPrompt = useDebounce(prompt, 150);

  useEffect(() => {
    window.ipc.onOpenSettings(() => setSettingsOpen(true));

    // Listen for invalid key events
    window.ipc.onInvalidKey((providerId) => {
      setInvalidKeyError(`Invalid API key for ${providerId}`);
      setTimeout(() => setInvalidKeyError(null), 5000);
    });
  }, []);

  // Initialize with a new chat if none exists
  useEffect(() => {
    if (!currentChat) {
      createNewChat();
    }
  }, [currentChat, createNewChat]);

  const send = async () => {
    if (!debouncedPrompt.trim() || selected.length === 0 || isLoading) return;

    pushMessage({ role: 'user', content: debouncedPrompt });
    setIsLoading(true);

    // Map model IDs to provider IDs
    const providerMap: Record<string, string> = {
      'o3-2025-04-16': 'openai',
      'gpt-4.1-mini': 'openai',
      'claude-opus-4-20250514': 'anthropic',
      'claude-3-haiku': 'anthropic',
      'grok-3': 'grok',
      'grok-3-mini': 'grok',
      'models/gemini-2.5-pro-thinking': 'gemini',
      'models/gemini-1.5-flash-fast': 'gemini',
    };

    const selectedProviders = [
      ...new Set(selected.map((modelId) => providerMap[modelId]).filter(Boolean)),
    ];

    try {
      const results = await window.api.sendPrompts(
        debouncedPrompt,
        selectedProviders as ('openai' | 'anthropic' | 'grok' | 'gemini')[]
      );
      pushMessages(
        results.map((r) => ({
          role: 'assistant' as const,
          content: r.answer,
          cost: r.costUSD,
          provider: r.provider,
          answer: r.answer,
          costUSD: r.costUSD,
        }))
      );
    } catch (err: any) {
      if (err.message.includes('API key')) setSettingsOpen(true);
    } finally {
      setIsLoading(false);
    }

    setPrompt('');
  };

  // Get messages from current chat and organize into conversation rounds
  const messages = currentChat?.messages || [];
  const conversationRounds = useMemo(() => {
    const rounds: Array<{ userMessage: any; assistantMessages: any[] }> = [];
    let currentUserMessage = null;
    let currentAssistantMessages: any[] = [];

    for (const message of messages) {
      if (message.role === 'user') {
        // Save previous round if it exists
        if (currentUserMessage && currentAssistantMessages.length > 0) {
          rounds.push({
            userMessage: currentUserMessage,
            assistantMessages: currentAssistantMessages,
          });
        }
        // Start new round
        currentUserMessage = message;
        currentAssistantMessages = [];
      } else if (message.role === 'assistant' && currentUserMessage) {
        currentAssistantMessages.push(message);
      }
    }

    // Add the last round if it exists
    if (currentUserMessage && currentAssistantMessages.length > 0) {
      rounds.push({ userMessage: currentUserMessage, assistantMessages: currentAssistantMessages });
    }

    return rounds;
  }, [messages]);

  // Show ModelSelect only for new chats (no messages)
  const showModelSelect = messages.length === 0;

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="flex flex-1 overflow-hidden flex-col">
        <LoadingOverlay show={isLoading} message="Generating responses..." />

        {/* Sidebar - removed mobile functionality */}
        <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <div>
                <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
                  {currentChat?.title || 'New Chat'}
                </h1>
                {messages.length > 0 && (
                  <p className="text-sm text-stone-600 dark:text-stone-300">
                    {conversationRounds.length} round{conversationRounds.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />
          </div>

          {/* Invalid key toast */}
          {invalidKeyError && (
            <div className="mx-4 mt-4">
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <span>{invalidKeyError}</span>
                <button
                  onClick={() => {
                    setInvalidKeyError(null);
                    setSettingsOpen(true);
                  }}
                  className="underline hover:no-underline"
                >
                  Fix keys
                </button>
              </div>
            </div>
          )}

          {/* Model Selection for New Chats */}
          {showModelSelect && (
            <div className="p-4 border-b border-stone-200 bg-stone-100 dark:bg-stone-800 dark:border-stone-700">
              <h3 className="text-sm font-medium text-stone-800 dark:text-stone-50 mb-3">
                Select AI Models:
              </h3>
              <ModelSelect selectedModels={selected} onSelectionChange={setSelected} />
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {conversationRounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="max-w-md">
                  <svg
                    className="w-16 h-16 mx-auto text-stone-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-stone-800 dark:text-stone-50 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-stone-600 dark:text-stone-300">
                    Select one or more AI models and send a message to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {conversationRounds.map((round, index) => (
                  <ConversationRound
                    key={index}
                    userMessage={round.userMessage}
                    assistantMessages={round.assistantMessages}
                    roundIndex={index}
                    isLatest={index === conversationRounds.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-200 p-4 bg-stone-100 dark:bg-stone-800 dark:border-stone-700">
            <div className="max-w-4xl mx-auto">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && !isLoading && (e.preventDefault(), send())
                }
                placeholder="Ask something…"
                className="resize-none mb-3 border-[var(--border)] focus:border-[var(--border)] focus:ring-slate-500 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                disabled={isLoading}
                rows={3}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-stone-600">
                  Press Enter to send, Shift+Enter for new line
                </p>
                <Button
                  onClick={send}
                  className={`bg-slate-600 hover:bg-slate-700 text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={selected.length === 0 || isLoading}
                >
                  {isLoading
                    ? 'Sending...'
                    : `Send ${selected.length > 1 ? `to ${selected.length} models` : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
