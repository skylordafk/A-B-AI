import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useProject, type ChatMessage, type ChatConversation } from './ProjectContext';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  cost?: number;
  provider?: string;
  tokens?: { input: number; output: number };
  id?: string;
  timestamp?: number;
}

export interface BatchSummary {
  totalRows: number;
  successCount: number;
  errorCount: number;
  totalCost: number;
  averageLatency: number;
  duration: number;
  modelsUsed: string[];
  timestamp: string;
}

interface ChatContextType {
  chats: ChatConversation[];
  currentChatId: string | null;
  currentChat: ChatConversation | null;
  createNewChat: () => string;
  switchToChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  pushMessage: (message: Message) => void;
  pushMessages: (messages: Message[]) => void;
  pushBatchSummary: (summary: BatchSummary) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  clearAllChats: () => void;

  /* ---- Fields expected by ChatPage.tsx ---- */
  messages: Message[];
  sendMessage: (prompt: string) => Promise<void>;
  isThinking: boolean;

  model: string;
  setModel: (m: string) => void;
  multiModel: boolean;
  setMultiModel: (v: boolean) => void;
  temperature: number;
  setTemperature: (t: number) => void;
  maxTokens: number;
  setMaxTokens: (n: number) => void;
  selectedProviders: string[];
  setSelectedProviders: (ids: string[]) => void;
  stop: () => void;
  mode: string;
  setMode: (m: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const {
    currentProject,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversation,
    addMessage,
    getCurrentConversation,
  } = useProject();

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Sync current chat ID with project's current conversation
  useEffect(() => {
    if (currentProject?.currentConversationId !== currentChatId) {
      setCurrentChatId(currentProject?.currentConversationId || null);
    }
  }, [currentProject?.currentConversationId, currentChatId]);

  const generateChatTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (firstUserMessage && firstUserMessage.content.length > 0) {
      return (
        firstUserMessage.content.substring(0, 30).trim() +
        (firstUserMessage.content.length > 30 ? '...' : '')
      );
    }
    return 'New Chat';
  };

  // Convert Message to ChatMessage for storage
  const convertMessageToChatMessage = (msg: Message): Omit<ChatMessage, 'id' | 'timestamp'> => ({
    role: msg.role,
    content: msg.content,
    provider: msg.provider,
    cost: msg.cost,
    tokens: msg.tokens,
  });

  const createNewChat = (): string => {
    if (!currentProject) return '';

    const conversationId = createConversation();
    setCurrentChatId(conversationId);
    switchConversation(conversationId);
    return conversationId;
  };

  const switchToChat = (chatId: string) => {
    if (!currentProject || !currentProject.chatHistory) return;

    const chatExists = currentProject.chatHistory.find((conv) => conv.id === chatId);
    if (chatExists) {
      setCurrentChatId(chatId);
      switchConversation(chatId);
    }
  };

  const deleteChat = (chatId: string) => {
    if (!currentProject || !currentProject.chatHistory) return;

    deleteConversation(chatId);

    // Update local state
    if (currentChatId === chatId) {
      const remainingChats = currentProject.chatHistory.filter((conv) => conv.id !== chatId);
      if (remainingChats.length > 0) {
        const newChatId = remainingChats[remainingChats.length - 1].id;
        setCurrentChatId(newChatId);
        switchConversation(newChatId);
      } else {
        // No chats left, create a new one
        setTimeout(() => {
          createNewChat();
        }, 0);
      }
    }
  };

  const pushMessage = (message: Message) => {
    if (!currentProject || !currentChatId) {
      // Create a new chat if none exists
      createNewChat();
      // The message will be added in the next call due to state update timing
      setTimeout(() => pushMessage(message), 0);
      return;
    }

    addMessage(currentChatId, convertMessageToChatMessage(message));

    // Auto-generate title from first user message
    const currentConv = getCurrentConversation();
    if (message.role === 'user' && currentConv && currentConv.messages.length === 1) {
      const newTitle = generateChatTitle([message]);
      updateConversation(currentChatId, { name: newTitle });
    }
  };

  const pushMessages = (newMessages: Message[]) => {
    if (!currentProject || !currentChatId) {
      return;
    }

    newMessages.forEach((msg) => {
      addMessage(currentChatId, convertMessageToChatMessage(msg));
    });
  };

  const pushBatchSummary = (summary: BatchSummary) => {
    if (!currentProject || !currentChatId) {
      // Create a new chat if none exists
      createNewChat();
      // The summary will be added in the next call due to state update timing
      setTimeout(() => pushBatchSummary(summary), 0);
      return;
    }

    // Format duration
    const formatDuration = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    };

    // Create a formatted summary message
    const summaryContent = `📊 **Batch Processing Complete**

**Results:**
• **${summary.totalRows}** total prompts processed
• **${summary.successCount}** successful responses
• **${summary.errorCount}** failed prompts
• **${formatDuration(summary.duration)}** total time
• **${Math.round(summary.averageLatency)}ms** average response time

**Cost:** $${summary.totalCost.toFixed(8)}

**Models Used:** ${summary.modelsUsed.map((m) => m.split('/').pop()).join(', ')}

*Detailed results have been saved and are available in the batch processing tab.*`;

    const batchMessage: Message = {
      role: 'assistant',
      content: summaryContent,
      cost: summary.totalCost,
      provider: 'Batch System',
      timestamp: new Date(summary.timestamp).getTime(),
      id: `batch-${Date.now()}`,
    };

    addMessage(currentChatId, convertMessageToChatMessage(batchMessage));
  };

  const updateChatTitle = (chatId: string, title: string) => {
    if (!currentProject) return;
    updateConversation(chatId, { name: title });
  };

  const clearAllChats = () => {
    if (!currentProject || !currentProject.chatHistory) return;

    // Delete all conversations
    currentProject.chatHistory.forEach((conv) => {
      deleteConversation(conv.id);
    });

    setCurrentChatId(null);
  };

  // Get chats from project history
  const chats: ChatConversation[] = useMemo(() => {
    if (!currentProject || !currentProject.chatHistory) return [];

    return currentProject.chatHistory;
  }, [currentProject, currentProject?.chatHistory]);

  const currentChat = useMemo(() => {
    return chats.find((chat) => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  /* ====== Extra state for ChatPage expectations ====== */
  const [isThinking, setIsThinking] = useState(false);
  const [model, setModel] = useState('');
  const [multiModel, setMultiModel] = useState(false);
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [mode, setMode] = useState('default');

  // Derived flat list of messages for the active conversation
  const messages: Message[] = useMemo(() => {
    if (!currentChat) return [];
    return currentChat.messages.map((m) => ({
      role: m.role,
      content: m.content,
      provider: m.provider,
      cost: m.cost,
      tokens: m.tokens,
      id: m.id,
      timestamp: m.timestamp,
    }));
  }, [currentChat]);

  /**
   * Sends a prompt to the backend via `window.api` helpers and stores
   * both the user prompt and the assistant responses in the chat history.
   */
  const sendMessage = async (prompt: string) => {
    if (!prompt.trim()) return;

    // Push the user message immediately
    const userMsg: Message = { role: 'user', content: prompt, id: `user-${Date.now()}` };
    pushMessage(userMsg);

    setIsThinking(true);

    try {
      // Decide which IPC method to use
      if (selectedProviders.length > 0 && window.api?.sendPrompts) {
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const results = await window.api.sendPrompts(prompt, selectedProviders as any, history);

        results.forEach((r: any) => {
          const assistantMsg: Message = {
            role: 'assistant',
            content: r.answer,
            provider: r.provider,
            cost: r.costUSD,
            id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          };
          pushMessage(assistantMsg);
        });
      } else if (window.api?.sendPrompt) {
        const r = await window.api.sendPrompt(prompt);
        const assistantMsg: Message = {
          role: 'assistant',
          content: r.answer,
          provider: 'Model',
          cost: r.costUSD,
          id: `assistant-${Date.now()}`,
        };
        pushMessage(assistantMsg);
      }
    } catch (err: any) {
      pushMessage({ role: 'assistant', content: `Error: ${err.message}`, provider: 'Error' });
    } finally {
      setIsThinking(false);
    }
  };

  const stop = () => {
    // In future this could call an IPC channel to abort, but for now just unset thinking flag
    setIsThinking(false);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChatId,
        currentChat,
        createNewChat,
        switchToChat,
        deleteChat,
        pushMessage,
        pushMessages,
        pushBatchSummary,
        updateChatTitle,
        clearAllChats,

        // ---- Extended API ----
        messages,
        sendMessage,
        isThinking,

        model,
        setModel,
        multiModel,
        setMultiModel,
        temperature,
        setTemperature,
        maxTokens,
        setMaxTokens,
        selectedProviders,
        setSelectedProviders,
        stop,
        mode,
        setMode,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
