import { useProjectStore } from '../../store/projectStore';

export default function ChatSidebar() {
  const {
    projects,
    currentProjectId,
    currentConversationId,
    createConversation,
    switchConversation,
    deleteConversation,
    messages,
    getConversationsArray,
  } = useProjectStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const allConversations = getConversationsArray();
  const projectConversations = allConversations.filter((c) => c.projectId === currentProjectId);

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString();
  };

  const getLastMessage = (conversationId: string) => {
    const conversationMessages = messages[conversationId] || [];
    const lastUserMessage = conversationMessages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) return 'No messages yet';
    return (
      lastUserMessage.content.substring(0, 50) + (lastUserMessage.content.length > 50 ? '...' : '')
    );
  };

  const handleNewConversation = async () => {
    await createConversation('New Chat');
  };

  const handleSwitchConversation = (conversationId: string) => {
    switchConversation(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(conversationId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Conversations</h2>
        </div>

        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {!currentProject ? (
          <div className="p-4 text-center text-[var(--text-secondary)]">
            <p>No project selected</p>
            <p className="text-sm mt-1">Select a project to view conversations</p>
          </div>
        ) : projectConversations.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-secondary)]">
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Start a new conversation!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {projectConversations
              .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
              .map((conversation) => {
                const conversationMessages = messages[conversation.id] || [];
                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleSwitchConversation(conversation.id)}
                    className={`
                      group relative p-3 rounded-lg cursor-pointer transition-all duration-200
                      ${
                        currentConversationId === conversation.id
                          ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-[var(--bg-primary)] border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate text-[var(--text-primary)]">
                          {conversation.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {getLastMessage(conversation.id)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">
                          {formatTime(new Date(conversation.lastUsed || conversation.createdAt))}
                        </p>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-[var(--text-secondary)] hover:text-red-600
                          ml-2 flex-shrink-0
                        "
                        title="Delete conversation"
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
                    {conversationMessages.length > 0 && (
                      <div className="mt-2 flex items-center text-xs text-[var(--text-secondary)]">
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
                        {conversationMessages.length} message
                        {conversationMessages.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-secondary)] text-center">
          {currentProject
            ? `${currentProject.name} • ${projectConversations.length} conversation${projectConversations.length !== 1 ? 's' : ''}`
            : 'No project selected'}
        </p>
      </div>
    </div>
  );
}
