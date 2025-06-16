import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';

interface BatchHistoryEntry {
  type: string;
  rowId?: string;
  prompt?: string;
  model?: string;
  response?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  latency?: number;
  status?: string;
  ts: number;
  // Chat history entries
  conversationId?: string;
  messageId?: string;
  role?: string;
  content?: string;
  provider?: string;
}

export default function BatchHistory() {
  const { currentProject } = useProject();
  const [historyEntries, setHistoryEntries] = useState<BatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'batch' | 'chat'>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [currentProject]);

  const loadHistory = async () => {
    if (!currentProject || !window.api?.readHistory) {
      setLoading(false);
      return;
    }

    try {
      const entries = await window.api.readHistory(currentProject.name);
      setHistoryEntries(entries.sort((a, b) => b.ts - a.ts)); // Sort by timestamp, newest first
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return <div className="text-center py-8 text-[var(--text-muted)]">No project selected</div>;
  }

  if (loading) {
    return <div className="text-center py-8 text-[var(--text-muted)]">Loading history...</div>;
  }

  const filteredEntries = historyEntries.filter((entry) => {
    if (filter === 'all') return true;
    if (filter === 'batch') return entry.type === 'batch' || !entry.type; // Legacy entries without type
    if (filter === 'chat') return entry.type === 'chat';
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEntryTitle = (entry: BatchHistoryEntry) => {
    if (entry.type === 'chat') {
      return `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content?.substring(0, 50)}...`;
    }
    return entry.prompt?.substring(0, 50) + '...' || 'Batch Entry';
  };

  const getEntryStatus = (entry: BatchHistoryEntry) => {
    if (entry.type === 'chat') {
      return entry.role || 'unknown';
    }
    return entry.status || 'unknown';
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'chat') {
      return status === 'user'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }

    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'error':
      case 'error-api':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'error-missing-key':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const toggleExpanded = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Processing History ({filteredEntries.length} entries)
        </h3>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'batch' | 'chat')}
            className="px-3 py-1 text-sm border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Entries</option>
            <option value="batch">Batch Processing</option>
            <option value="chat">Chat Messages</option>
          </select>

          <button
            onClick={loadHistory}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
          <p className="text-[var(--text-muted)] mb-4">
            {filter === 'all' ? 'No processing history yet' : `No ${filter} history yet`}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Start using the app to see your activity history here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry, index) => {
            const entryId = `${entry.ts}-${index}`;
            const status = getEntryStatus(entry);
            const isExpanded = expandedEntry === entryId;

            return (
              <div
                key={entryId}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status, entry.type || 'batch')}`}
                      >
                        {entry.type === 'chat'
                          ? status === 'user'
                            ? 'User'
                            : 'Assistant'
                          : status}
                      </span>

                      {entry.type === 'chat' && entry.provider && (
                        <span className="text-xs text-[var(--text-muted)]">
                          via {entry.provider}
                        </span>
                      )}

                      {entry.model && (
                        <span className="text-xs text-[var(--text-muted)]">{entry.model}</span>
                      )}
                    </div>

                    <h4 className="font-medium text-[var(--text-primary)] mb-1">
                      {getEntryTitle(entry)}
                    </h4>

                    <div className="text-sm text-[var(--text-secondary)] space-y-1">
                      <p>{formatDate(entry.ts)}</p>

                      {entry.cost && <p>Cost: ${entry.cost.toFixed(8)}</p>}

                      {entry.latency && <p>Response time: {entry.latency}ms</p>}

                      {(entry.tokensIn || entry.tokensOut) && (
                        <p>
                          Tokens: {entry.tokensIn || 0} in / {entry.tokensOut || 0} out
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpanded(entryId)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="View details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={isExpanded ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                      />
                    </svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-[var(--text-primary)] mb-2">Input</h5>
                        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-3 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-[var(--text-primary)]">
                            {entry.prompt || entry.content || 'No input content'}
                          </pre>
                        </div>
                      </div>

                      {entry.response && (
                        <div>
                          <h5 className="font-medium text-[var(--text-primary)] mb-2">Output</h5>
                          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-3 max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-[var(--text-primary)]">
                              {entry.response}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>

                    {entry.type === 'chat' && entry.conversationId && (
                      <div className="mt-3 text-xs text-[var(--text-muted)]">
                        Conversation ID: {entry.conversationId}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
