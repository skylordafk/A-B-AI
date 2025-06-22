import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from './components/ui/textarea';
import SplitButton from './components/ui/SplitButton';
import SettingsModal from './components/SettingsModal';
import ModelSelect from './components/ModelSelect';
import ReactDiffViewer from 'react-diff-viewer-continued';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mergeAdjacentCodeFences from './lib/markdown';
// import LoadingOverlay from './components/LoadingOverlay';
import ChatSidebar from './components/ChatSidebar';
import { useChat } from './contexts/ChatContext';
import { useProject } from './contexts/ProjectContext';
import TerminalBlock from './components/TerminalBlock';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './contexts/ThemeContext';
import type { Message as ChatMessageFromContext } from './contexts/ChatContext';

// Re-defining Message type locally for clarity, as ChatPage now manages its own state.
type Message = ChatMessageFromContext;

// Debounce hook
/*
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
*/

// Feature status indicator component
function FeatureStatusIndicator() {
  const [features, setFeatures] = useState({
    webSearch: false,
    extendedThinking: false,
    promptCaching: false,
    cacheTTL: '5m' as '5m' | '1h',
  });

  useEffect(() => {
    // Load feature status
    Promise.all([
      window.api.getEnableWebSearch(),
      window.api.getEnableExtendedThinking(),
      window.api.getEnablePromptCaching(),
      window.api.getPromptCacheTTL(),
    ]).then(([webSearch, extendedThinking, promptCaching, cacheTTL]) => {
      setFeatures({ webSearch, extendedThinking, promptCaching, cacheTTL });
    });
  }, []);

  const activeFeatures = [];
  if (features.webSearch) activeFeatures.push('Web Search');
  if (features.extendedThinking) activeFeatures.push('Extended Thinking');
  if (features.promptCaching) activeFeatures.push(`Prompt Caching (${features.cacheTTL})`);

  if (activeFeatures.length === 0) return null;

  return (
    <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border">
      <span className="font-medium">Claude Features Active:</span> {activeFeatures.join(', ')}
    </div>
  );
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
      className={`flex items-center gap-1 px-1.5 py-0.5 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded-sm border border-slate-600 transition-colors ${className}`}
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
const AssistantComparison = ({ assistantMessages }: { assistantMessages: Message[] }) => {
  const { mode } = useTheme();
  const [sideBySide, setSideBySide] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  // Helpers to render the two answers inside TerminalBlock
  const renderAnswers = () => (
    <div className={`grid gap-2 ${sideBySide ? 'md:grid-cols-2 grid-cols-1' : 'grid-cols-1'}`}>
      {assistantMessages.map((msg, idx) => (
        <div key={idx} className="max-w-full">
          <div className="flex items-center gap-2 mb-1">
            {msg.provider && (
              <p className="text-xs text-stone-500 dark:text-stone-300 ml-1">{msg.provider}</p>
            )}
            <CopyButton text={msg.content} />
          </div>
          <TerminalBlock>
            <div className="prose prose-sm max-w-none prose-stone">
              <ReactMarkdown remarkPlugins={[remarkGfm, mergeAdjacentCodeFences]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </TerminalBlock>
          {msg.cost !== undefined && (
            <p className="text-xs text-stone-400 dark:text-stone-300 mt-1 ml-1">
              Cost: ${msg.cost.toFixed(4)}
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
            {assistantMessages[0].provider} - Cost: ${assistantMessages[0].cost?.toFixed(8)}
          </span>
          <CopyButton text={assistantMessages[0].content} />
        </div>
        <div className="flex items-center gap-2">
          <span>
            {assistantMessages[1].provider} - Cost: ${assistantMessages[1].cost?.toFixed(8)}
          </span>
          <CopyButton text={assistantMessages[1].content} />
        </div>
      </div>
      <ReactDiffViewer
        oldValue={assistantMessages[0].content}
        newValue={assistantMessages[1].content}
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
    <div className="border border-stone-300 dark:border-stone-600 rounded p-3 bg-stone-200 dark:bg-stone-700 relative max-h-[60vh] overflow-hidden flex flex-col">
      <div className="flex justify-end gap-1 mb-2 flex-shrink-0">
        <button
          onClick={() => setSideBySide(!sideBySide)}
          className="text-xs px-1.5 py-0.5 bg-slate-600 hover:bg-slate-700 text-white border border-slate-600 rounded-sm transition-colors"
        >
          {sideBySide ? 'Single column' : 'Compare side-by-side'}
        </button>
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="text-xs px-1.5 py-0.5 bg-slate-600 hover:bg-slate-700 text-white border border-slate-600 rounded-sm transition-colors"
        >
          {showDiff ? 'Hide diff' : 'Show diff'}
        </button>
      </div>

      <div className="overflow-y-auto flex-grow">{showDiff ? renderDiff() : renderAnswers()}</div>
    </div>
  );
};

const ConversationRound = ({
  userMessage,
  assistantMessages,
  roundIndex,
}: {
  userMessage: Message;
  assistantMessages: Message[];
  roundIndex: number;
}) => {
  return (
    <div key={`round-${roundIndex}`}>
      {/* User Message */}
      <div className="mb-2">
        <div className="flex justify-end">
          <div className="max-w-3xl w-full">
            <p className="text-xs text-stone-500 dark:text-stone-300 text-right mb-1">You</p>
            <TerminalBlock>
              <div className="prose prose-sm max-w-none prose-stone">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{userMessage.content}</ReactMarkdown>
              </div>
            </TerminalBlock>
          </div>
        </div>
      </div>

      {/* Assistant Messages */}
      {assistantMessages.length > 1 ? (
        <AssistantComparison assistantMessages={assistantMessages} />
      ) : (
        assistantMessages.map((msg, msgIdx) => (
          <div key={msgIdx} className="mb-4">
            <div className="flex justify-start">
              <div className="max-w-3xl w-full">
                <div className="flex items-center gap-2 mb-1">
                  {msg.provider && (
                    <p className="text-xs text-stone-500 dark:text-stone-300">{msg.provider}</p>
                  )}
                  <CopyButton text={msg.content} />
                </div>
                <TerminalBlock>
                  <div className="prose prose-sm max-w-none prose-stone">
                    <ReactMarkdown remarkPlugins={[remarkGfm, mergeAdjacentCodeFences]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </TerminalBlock>
                {msg.cost !== undefined && (
                  <p className="text-xs text-stone-400 dark:text-stone-300 mt-1">
                    Cost: ${msg.cost.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default function ChatPage() {
  const { currentChat, pushMessage, createNewChat } = useChat();

  const { currentProject } = useProject();
  const navigate = useNavigate();

  // Local state management for the Chat UI
  const [input, setInput] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [multiModel, setMultiModel] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentProject) {
      navigate('/');
    }
  }, [currentProject, navigate]);

  useEffect(() => {
    const cleanup = window.ipc?.onOpenSettings(() => {
      setSettingsOpen(true);
    });
    return () => {
      cleanup?.();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    // HACK: A small delay to allow the DOM to update after a message is added
    // This is especially important for long messages with code blocks
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [currentChat?.messages, isThinking]);

  const send = async (prompt?: string) => {
    const text = prompt || input;
    if (input.trim() === '' || isThinking) return;

    let currentChatId = currentChat?.id;
    if (!currentChatId) {
      currentChatId = createNewChat();
    }

    const userMessage: Message = { role: 'user', content: text, id: `user-${Date.now()}` };
    pushMessage(userMessage);
    setInput('');
    setIsThinking(true);

    try {
      const history = (currentChat?.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (selectedProviders.length > 0 && window.api?.sendPrompts) {
        const results = await window.api.sendPrompts(text, selectedProviders as any, history);
        results.forEach((r: any) => {
          const assistantMsg: Message = {
            role: 'assistant',
            content: r.answer,
            provider: r.provider,
            cost: r.costUSD,
            id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          };
          pushMessage(assistantMsg);
        });
      }
    } catch (err: any) {
      pushMessage({ role: 'assistant', content: `Error: ${err.message}`, provider: 'Error' });
    } finally {
      setIsThinking(false);
    }
  };

  const stop = () => {
    // For now, this just updates the UI state.
    // In the future, it could call an IPC handler to abort backend requests.
    setIsThinking(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  // Derive messages from the context
  const messages = useMemo(() => currentChat?.messages || [], [currentChat]);

  const groupedMessages = useMemo(() => {
    const groups: { user: Message; assistants: Message[] }[] = [];
    let currentUserMessage: Message | null = null;

    messages.forEach((msg) => {
      if (msg.role === 'user') {
        if (currentUserMessage) {
          groups.push({ user: currentUserMessage, assistants: [] });
        }
        currentUserMessage = msg;
      } else if (msg.role === 'assistant' && currentUserMessage) {
        const lastGroup = groups.find((g) => g.user === currentUserMessage);
        if (lastGroup) {
          lastGroup.assistants.push(msg);
        } else {
          groups.push({ user: currentUserMessage, assistants: [msg] });
        }
      }
    });

    if (currentUserMessage) {
      // Find the corresponding group for the last user message to avoid duplication
      if (!groups.some((g) => g.user === currentUserMessage)) {
        groups.push({
          user: currentUserMessage,
          assistants: messages.filter(
            (m) => m.role === 'assistant' && !groups.flatMap((g) => g.assistants).includes(m)
          ),
        });
      }
    }

    return groups;
  }, [messages]);

  return (
    <div className="flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50">
      <ChatSidebar isOpen={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? '' : ''}`}
      >
        <div className="flex-1 flex flex-col relative">
          {/* Header */}
          <header className="flex items-center justify-between p-2 border-b border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="p-1 rounded bg-slate-600 hover:bg-slate-700 text-white transition-colors"
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
                <h1 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                  {currentProject?.name || 'New Chat'}
                </h1>
                {messages.length > 0 && (
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    {groupedMessages.length} round{groupedMessages.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <ThemeToggle />
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-3" ref={messagesEndRef}>
            {groupedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="max-w-md">
                  <h2 className="text-lg font-medium text-stone-800 dark:text-stone-100">
                    A-B-AI Chat
                  </h2>
                  <p className="text-stone-600 dark:text-stone-400 mt-1">
                    Select your models and start a new conversation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {groupedMessages.map((round, index) => (
                  <ConversationRound
                    key={round.user.id || `round-${index}`}
                    userMessage={round.user}
                    assistantMessages={round.assistants}
                    roundIndex={index}
                  />
                ))}
              </div>
            )}
            {isThinking && groupedMessages.length > 0 && (
              <div className="mt-4 text-center text-stone-500 dark:text-stone-400">
                AI is thinking...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-200 dark:border-stone-700 p-2">
            <div className="max-w-4xl mx-auto">
              <div className="p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg">
                <div className="mb-2">
                  <ModelSelect
                    selectedModels={selectedProviders}
                    onSelectionChange={setSelectedProviders}
                  />
                </div>
                <FeatureStatusIndicator />
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something…"
                  className="resize-none mb-1.5 border-0 focus:ring-0 bg-transparent text-stone-900 dark:text-stone-50"
                  disabled={isThinking}
                  rows={2}
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={multiModel}
                        onChange={(e) => setMultiModel(e.target.checked)}
                      />
                      Compare models
                    </label>
                  </div>
                  <SplitButton
                    primaryAction={{
                      label:
                        selectedProviders.length > 1
                          ? `Send to ${selectedProviders.length} models`
                          : 'Send Prompt',
                      onClick: () => send(),
                      disabled: selectedProviders.length === 0 || isThinking,
                    }}
                    dropdownActions={[
                      {
                        label: 'Batch Prompting',
                        onClick: () => navigate('/batch'),
                      },
                      {
                        label: 'Settings',
                        onClick: () => setSettingsOpen(true),
                      },
                      {
                        label: 'Stop',
                        onClick: stop,
                        disabled: !isThinking,
                      },
                    ]}
                    loading={isThinking}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <SettingsModal open={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  );
}
