import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  cost?: number;
  provider?: string;
  answer?: string;
  costUSD?: number;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const generateChatId = () => `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const generateChatTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (firstUserMessage && firstUserMessage.content.length > 0) {
      // Take first 30 chars of the first user message
      return (
        firstUserMessage.content.substring(0, 30).trim() +
        (firstUserMessage.content.length > 30 ? '...' : '')
      );
    }
    return 'New Chat';
  };

  const createNewChat = (): string => {
    const newChatId = generateChatId();
    const newChat: Chat = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setChats((prev) => [...prev, newChat]);
    setCurrentChatId(newChatId);
    return newChatId;
  };

  const switchToChat = (chatId: string) => {
    const chatExists = chats.find((chat) => chat.id === chatId);
    if (chatExists) {
      setCurrentChatId(chatId);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => {
      const filteredChats = prev.filter((chat) => chat.id !== chatId);

      // If we're deleting the current chat, switch to another one or create new
      if (currentChatId === chatId) {
        if (filteredChats.length > 0) {
          setCurrentChatId(filteredChats[filteredChats.length - 1].id);
        } else {
          // No chats left, create a new one
          setTimeout(() => createNewChat(), 0);
        }
      }

      return filteredChats;
    });
  };

  const updateCurrentChat = (updater: (chat: Chat) => Chat) => {
    if (!currentChatId) return;

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId ? { ...updater(chat), updatedAt: new Date() } : chat
      )
    );
  };

  const pushMessage = (message: Message) => {
    if (!currentChatId) {
      // Create a new chat if none exists
      createNewChat();
      // The message will be added in the next call due to state update timing
      setTimeout(() => pushMessage(message), 0);
      return;
    }

    updateCurrentChat((chat) => {
      const updatedChat = { ...chat, messages: [...chat.messages, message] };

      // Auto-generate title from first user message
      if (message.role === 'user' && chat.messages.length === 0) {
        updatedChat.title = generateChatTitle([message]);
      }

      return updatedChat;
    });
  };

  const pushMessages = (newMessages: Message[]) => {
    if (!currentChatId) return;

    updateCurrentChat((chat) => ({
      ...chat,
      messages: [...chat.messages, ...newMessages],
    }));
  };

  const updateChatTitle = (chatId: string, title: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat))
    );
  };

  const clearAllChats = () => {
    setChats([]);
    setCurrentChatId(null);
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId) || null;

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
