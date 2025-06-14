import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from './components/ui/textarea';
import SplitButton from './components/ui/SplitButton';
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
import type { Message } from './contexts/ChatContext';

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
            {assistantMessages[0].provider} - Cost: ${assistantMessages[0].cost?.toFixed(4)}
          </span>
          <CopyButton text={assistantMessages[0].content} />
        </div>
        <div className="flex items-center gap-2">
          <span>
            {assistantMessages[1].provider} - Cost: ${assistantMessages[1].cost?.toFixed(4)}
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
    <div className="border border-stone-300 dark:border-stone-600 rounded p-3 bg-stone-200 dark:bg-stone-700 relative">
      <div className="flex justify-end gap-1 mb-2">
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
      {showDiff ? renderDiff() : renderAnswers()}
    </div>
  );
};

// Collapsible conversation round component
const ConversationRound = ({
  userMessage,
  assistantMessages,
  roundIndex,
}: {
  userMessage: Message;
  assistantMessages: Message[];
  roundIndex: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-stone-200 rounded mb-2 bg-stone-50 dark:bg-stone-800 dark:border-stone-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 text-left flex items-center justify-between bg-stone-50 dark:bg-stone-700 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors text-stone-900 dark:text-stone-50"
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
        <div className="border-t border-stone-200 p-3 space-y-3">
          {/* User message */}
          <div className="text-right">
            <div className="inline-block max-w-3xl p-2 bg-slate-600 text-white rounded">
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
                  className="inline-block p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded relative text-stone-900 dark:text-stone-50"
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
  const navigate = useNavigate();
  const { currentChat, pushMessage, pushMessages, createNewChat } = useChat();
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invalidKeyError, setInvalidKeyError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Local messages state that immediately reflects updates
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Sync local messages with currentChat, but preserve local updates
  useEffect(() => {
    if (currentChat?.messages) {
      // Convert ChatMessages to Messages
      const convertedMessages = currentChat.messages.map(
        (msg): Message => ({
          role: msg.role,
          content: msg.content,
          cost: msg.cost,
          provider: msg.provider,
          id: msg.id,
          timestamp: msg.timestamp,
        })
      );
      setLocalMessages(convertedMessages);
    }
  }, [currentChat?.id, currentChat?.messages?.length]);

  // Debounced prompt for performance
  const debouncedPrompt = useDebounce(prompt, 150);

  useEffect(() => {
    // Listen for menu settings event
    const handleMenuSettings = () => setSettingsOpen(true);
    window.ipc.onOpenSettings(handleMenuSettings);

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
  }, [currentChat]); // Removed createNewChat from dependencies to prevent infinite loop

  const send = async () => {
    if (!debouncedPrompt.trim() || selected.length === 0 || isLoading) {
      return;
    }

    // Create user message
    const userMessage = {
      role: 'user' as const,
      content: debouncedPrompt,
      id: `msg-${Date.now()}-user`,
      timestamp: Date.now(),
    };

    // Immediately update local state for instant feedback
    setLocalMessages((prev) => [...prev, userMessage]);

    // Also update through context (for persistence)
    pushMessage(userMessage);
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
      'models/gemini-2.5-flash-preview': 'gemini',
    };

    const selectedProviders = [
      ...new Set(selected.map((modelId) => providerMap[modelId]).filter(Boolean)),
    ];

    try {
      if (!window.api?.sendPrompts) {
        throw new Error('window.api.sendPrompts is not available');
      }

      const results = await window.api.sendPrompts(
        debouncedPrompt,
        selectedProviders as ('openai' | 'anthropic' | 'grok' | 'gemini')[]
      );

      // Create assistant messages with proper content
      const assistantMessages = results.map((r, idx) => ({
        role: 'assistant' as const,
        content: r.answer || '[No response]', // Ensure content is never undefined
        cost: r.costUSD,
        provider: r.provider,
        costUSD: r.costUSD,
        tokens: {
          input: r.promptTokens || 0,
          output: r.answerTokens || 0,
        },
        id: `msg-${Date.now()}-assistant-${idx}`,
        timestamp: Date.now() + idx,
      }));

      // Immediately update local state
      setLocalMessages((prev) => [...prev, ...assistantMessages]);

      // Also update through context
      pushMessages(assistantMessages);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${errorMsg}`,
        cost: 0,
        provider: 'System',
        costUSD: 0,
        tokens: { input: 0, output: 0 },
        id: `msg-${Date.now()}-error`,
        timestamp: Date.now(),
      };

      // Update local state with error
      setLocalMessages((prev) => [...prev, errorMessage]);

      if (errorMsg.includes('API key')) setSettingsOpen(true);
      pushMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }

    setPrompt('');
  };

  // Get messages from current chat and organize into conversation rounds
  const messages = localMessages; // Use local messages for immediate updates

  const conversationRounds = useMemo(() => {
    const rounds: Array<{ userMessage: Message; assistantMessages: Message[] }> = [];
    let currentUserMessage: Message | null = null;
    let currentAssistantMessages: Message[] = [];

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

    // Add the last round even if there are no assistant messages yet (user just sent a message)
    if (currentUserMessage) {
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
          <div className="flex items-center justify-between p-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
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
                  {currentChat?.name || 'New Chat'}
                </h1>
                {messages.length > 0 && (
                  <p className="text-xs text-stone-600 dark:text-stone-300">
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
            <div className="mx-2 mt-2">
              <div className="bg-red-500 text-white px-3 py-1.5 rounded shadow-lg flex items-center gap-2 text-sm">
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
            <div className="p-2 border-b border-stone-200 bg-stone-100 dark:bg-stone-800 dark:border-stone-700">
              <h3 className="text-sm font-medium text-stone-800 dark:text-stone-50 mb-2">
                Select AI Models:
              </h3>
              <ModelSelect selectedModels={selected} onSelectionChange={setSelected} />
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-3">
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
                    key={round.userMessage.id || `round-${index}`}
                    userMessage={round.userMessage}
                    assistantMessages={round.assistantMessages}
                    roundIndex={index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-200 p-2 bg-stone-100 dark:bg-stone-800 dark:border-stone-700">
            <div className="max-w-4xl mx-auto">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && !isLoading && (e.preventDefault(), send())
                }
                placeholder="Ask something…"
                className="resize-none mb-1.5 border-[var(--border)] focus:border-[var(--border)] focus:ring-slate-500 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                disabled={isLoading}
                rows={2}
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-stone-600">
                  Press Enter to send, Shift+Enter for new line
                </p>
                <SplitButton
                  primaryAction={{
                    label:
                      selected.length > 1 ? `Send to ${selected.length} models` : 'Send Prompt',
                    onClick: send,
                    disabled: selected.length === 0 || isLoading,
                  }}
                  dropdownActions={[
                    {
                      label: 'Open Batch Prompting...',
                      onClick: () => navigate('/batch'),
                      icon: (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      ),
                    },
                    {
                      label: 'Project Settings...',
                      onClick: () => navigate('/settings'),
                      icon: (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      ),
                    },
                  ]}
                  loading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
