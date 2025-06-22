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
import Layout from './components/Layout';
import ChatSidebar from './components/sidebars/ChatSidebar';
import ActivitySidebar from './components/sidebars/ActivitySidebar';
import { useProjectStore } from './store/projectStore';
import TerminalBlock from './components/TerminalBlock';
import { useTheme } from './contexts/ThemeContext';
// Message type for chat
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  cost?: number;
}

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
  const {
    projects,
    currentProjectId,
    currentConversationId,
    messages,
    sendMessage,
    createConversation,
    switchConversation: _switchConversation,
  } = useProjectStore();

  const navigate = useNavigate();

  // Local state management for the Chat UI
  const [input, setInput] = useState('');
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [multiModel, setMultiModel] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // JSON mode state
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonSchema, setJsonSchema] = useState('');
  const [schemaError, setSchemaError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentMessages = currentConversationId ? messages.get(currentConversationId) || [] : [];

  // JSON schema validation
  const validateSchema = () => {
    if (!jsonSchema.trim()) {
      setSchemaError('');
      return;
    }
    try {
      JSON.parse(jsonSchema);
      setSchemaError('');
    } catch (error) {
      setSchemaError('Invalid JSON schema');
    }
  };

  useEffect(() => {
    if (!currentProject) {
      navigate('/dashboard');
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
  }, [currentMessages, isThinking]);

  const send = async (prompt?: string) => {
    const text = prompt || input;
    if (text.trim() === '' || isThinking) return;

    // Create conversation if none exists
    if (!currentConversationId) {
      await createConversation('New Chat');
    }

    setInput('');
    setIsThinking(true);

    try {
      // Validate JSON schema if in JSON mode
      if (jsonMode && jsonSchema.trim()) {
        try {
          JSON.parse(jsonSchema);
        } catch (error) {
          throw new Error('Invalid JSON schema provided');
        }
      }

      // Use the Zustand store sendMessage function
      const schema = jsonMode && jsonSchema.trim() ? JSON.parse(jsonSchema) : undefined;
      await sendMessage(text, jsonMode, schema);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // You could add error handling here if needed
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

  // Derive grouped messages
  const groupedMessages = useMemo(() => {
    const groups: { user: Message; assistants: Message[] }[] = [];
    let currentUserMessage: Message | null = null;

    currentMessages.forEach((msg) => {
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
          assistants: currentMessages.filter(
            (m) => m.role === 'assistant' && !groups.flatMap((g) => g.assistants).includes(m)
          ),
        });
      }
    }

    return groups;
  }, [currentMessages]);

  return (
    <Layout leftSidebar={<ChatSidebar />} rightSidebar={<ActivitySidebar />}>
      <div className="flex flex-col h-full">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4" ref={messagesEndRef}>
          {groupedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="max-w-md">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">A-B-AI Chat</h2>
                <p className="text-[var(--text-secondary)] mt-2">
                  Select your models and start a new conversation.
                </p>
                {currentMessages.length > 0 && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                    {groupedMessages.length} round{groupedMessages.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
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
            <div className="mt-4 text-center text-[var(--text-secondary)]">AI is thinking...</div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-[var(--border)] p-4 bg-[var(--bg-secondary)]">
          <div className="max-w-4xl mx-auto">
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <div className="mb-3">
                <ModelSelect
                  selectedModels={selectedProviders}
                  onSelectionChange={setSelectedProviders}
                />
              </div>
              <FeatureStatusIndicator />

              {/* JSON Mode Controls */}
              <div className="json-mode-controls mb-4">
                <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={jsonMode}
                    onChange={(e) => setJsonMode(e.target.checked)}
                    className="rounded border-[var(--border)]"
                  />
                  <span>JSON Mode</span>
                </label>

                {jsonMode && (
                  <div className="mt-2">
                    <textarea
                      className="w-full h-32 px-3 py-2 text-sm font-mono border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Paste JSON Schema here..."
                      value={jsonSchema}
                      onChange={(e) => setJsonSchema(e.target.value)}
                      onBlur={validateSchema}
                    />
                    {schemaError && <p className="text-red-500 text-sm mt-1">{schemaError}</p>}
                  </div>
                )}
              </div>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something…"
                className="resize-none mb-3 border-0 focus:ring-0 bg-transparent text-[var(--text-primary)]"
                disabled={isThinking}
                rows={2}
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-[var(--text-secondary)]">
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
    </Layout>
  );
}
