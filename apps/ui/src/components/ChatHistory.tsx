import React, { useState } from 'react';
import { useProject, type ChatConversation } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

export default function ChatHistory() {
  const {
    currentProject,
    switchConversation,
    deleteConversation,
    updateConversation,
    createConversation,
  } = useProject();
  const navigate = useNavigate();
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);

  if (!currentProject) {
    return <div className="text-center py-8 text-[var(--text-muted)]">No project selected</div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConversationPreview = (conversation: ChatConversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) return 'No messages';

    return lastMessage.content.length > 100
      ? lastMessage.content.substring(0, 100) + '...'
      : lastMessage.content;
  };

  const handleRestoreConversation = (conversationId: string) => {
    switchConversation(conversationId);
    navigate('/chat');
  };

  const handleDeleteConversation = (conversationId: string, conversationName: string) => {
    if (confirm(`Delete conversation "${conversationName}"? This cannot be undone.`)) {
      deleteConversation(conversationId);
    }
  };

  const handleRenameConversation = (conversationId: string, currentName: string) => {
    const newName = prompt('Enter new conversation name:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
      updateConversation(conversationId, { name: newName.trim() });
    }
  };

  const toggleExpanded = (conversationId: string) => {
    setExpandedConversation(expandedConversation === conversationId ? null : conversationId);
  };

  const sortedConversations = [...currentProject.chatHistory].sort(
    (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Chat History ({currentProject.chatHistory.length} conversations)
        </h3>
        <button
          onClick={() => {
            createConversation();
            navigate('/chat');
          }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          New Conversation
        </button>
      </div>

      {sortedConversations.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
          <p className="text-[var(--text-muted)] mb-4">No conversations yet</p>
          <button
            onClick={() => {
              createConversation();
              navigate('/chat');
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Your First Conversation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 transition-all ${
                currentProject.currentConversationId === conversation.id
                  ? 'ring-2 ring-blue-500 border-blue-300'
                  : 'hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-[var(--text-primary)] truncate">
                      {conversation.name}
                    </h4>
                    {currentProject.currentConversationId === conversation.id && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-[var(--text-secondary)] space-y-1">
                    <p>Messages: {conversation.messages.length}</p>
                    <p>Last used: {formatDate(conversation.lastUsed)}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {getConversationPreview(conversation)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleExpanded(conversation.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="View messages"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          expandedConversation === conversation.id
                            ? 'M5 15l7-7 7 7'
                            : 'M19 9l-7 7-7-7'
                        }
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleRestoreConversation(conversation.id)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Continue this conversation"
                  >
                    Continue
                  </button>

                  <button
                    onClick={() => handleRenameConversation(conversation.id, conversation.name)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Rename conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleDeleteConversation(conversation.id, conversation.name)}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedConversation === conversation.id && (
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {conversation.messages.map((message, _index) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-md ${
                          message.role === 'user'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : 'bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-xs font-medium ${
                              message.role === 'user'
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {message.role === 'user'
                              ? 'You'
                              : `Assistant${message.provider ? ` (${message.provider})` : ''}`}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {message.cost && (
                          <div className="text-xs text-[var(--text-muted)] mt-2">
                            Cost: ${message.cost.toFixed(4)}
                            {message.tokens &&
                              ` • Tokens: ${message.tokens.input}/${message.tokens.output}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
