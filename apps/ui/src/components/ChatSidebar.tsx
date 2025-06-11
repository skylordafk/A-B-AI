import type { FC } from 'react';
import { Button } from './ui/button';
import { useChat } from '../contexts/ChatContext';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSidebar: FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const { chats, currentChatId, createNewChat, switchToChat, deleteChat } = useChat();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getLastMessage = (messages: any[]) => {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) return 'No messages yet';
    return (
      lastUserMessage.content.substring(0, 50) + (lastUserMessage.content.length > 50 ? '...' : '')
    );
  };

  const handleNewChat = () => {
    createNewChat();
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteChat(chatId);
    }
  };

  return (
    <div
      className={`
        fixed top-0 left-0 h-full bg-stone-100 dark:bg-stone-900 border-r border-stone-300 dark:border-stone-700 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 flex flex-col
      `}
    >
      {/* Header */}
      <div className="p-3 border-b border-stone-300 dark:border-stone-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Chats</h2>
          <button
            onClick={onToggle}
            className="p-1 rounded-md bg-slate-600 hover:bg-slate-700 text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <Button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-stone-600 dark:text-stone-400">
            <p>No chats yet</p>
            <p className="text-sm">Start a new conversation!</p>
          </div>
        ) : (
          <div className="p-1">
            {chats
              .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
              .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => switchToChat(chat.id)}
                  className={`
                    group relative p-2 mb-1 rounded cursor-pointer transition-all duration-200
                    ${
                      currentChatId === chat.id
                        ? 'bg-slate-200 dark:bg-stone-800 border border-slate-300 dark:border-stone-700'
                        : 'hover:bg-stone-200 dark:hover:bg-stone-800 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`
                        font-medium text-sm truncate
                        ${currentChatId === chat.id ? 'text-slate-900 dark:text-stone-50' : 'text-stone-900 dark:text-stone-50'}
                      `}
                      >
                        {chat.title}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                        {getLastMessage(chat.messages)}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                        {formatTime(chat.updatedAt)}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-stone-500 dark:text-stone-400 hover:text-red-600
                        ml-2 flex-shrink-0
                      "
                      title="Delete chat"
                    >
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Message count */}
                  {chat.messages.length > 0 && (
                    <div className="mt-2 flex items-center text-xs text-stone-500 dark:text-stone-400">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-stone-300 dark:border-stone-700">
        <p className="text-xs text-stone-600 dark:text-stone-400 text-center">
          Session chats • Clear on app restart
        </p>
      </div>
    </div>
  );
};

export default ChatSidebar;
