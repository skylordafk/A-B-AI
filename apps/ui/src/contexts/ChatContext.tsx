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
