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

interface ChatContextType {
  chats: ChatConversation[];
  currentChatId: string | null;
  currentChat: ChatConversation | null;
  createNewChat: () => string;
  switchToChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  pushMessage: (message: Message) => void;
  pushMessages: (messages: Message[]) => void;
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
