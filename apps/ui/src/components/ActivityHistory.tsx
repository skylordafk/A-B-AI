import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';

interface ActivityItem {
  id: string;
  type: 'chat' | 'batch';
  timestamp: number;
  title: string;
  preview?: string;
  cost?: number;
  tokenCount?: number;
  status?: 'completed' | 'failed' | 'processing';
}

interface ActivityHistoryProps {
  projectId: string;
  limit?: number;
}

export function ActivityHistory({ projectId, limit = 50 }: ActivityHistoryProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'chat' | 'batch'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [projectId, filter, limit]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getActivity(
        projectId,
        filter === 'all' ? undefined : filter,
        limit
      );

      // Transform the data to ActivityItem format
      const items: ActivityItem[] = (data || []).map((item: any) => ({
        id: item.id,
        type: item.type || 'chat',
        timestamp: item.timestamp || Date.now(),
        title: item.title || (item.type === 'batch' ? 'Batch Job' : 'Chat Message'),
        preview: item.preview || item.content?.substring(0, 100),
        cost: item.cost,
        tokenCount: item.tokenCount,
        status: item.status,
      }));

      setActivities(items);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  };

  const getStatusIcon = (item: ActivityItem) => {
    if (item.type === 'batch') {
      switch (item.status) {
        case 'processing':
          return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>;
        case 'completed':
          return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
        case 'failed':
          return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
        default:
          return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
      }
    }
    return (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md animate-pulse"
          >
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
            <div className="w-16 h-3 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="activity-history">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('chat')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            filter === 'chat'
              ? 'bg-blue-600 text-white'
              : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)]'
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setFilter('batch')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            filter === 'batch'
              ? 'bg-blue-600 text-white'
              : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)]'
          }`}
        >
          Batches
        </button>
      </div>

      <div className="space-y-2">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            No {filter === 'all' ? '' : filter} activity found for this project.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md hover:bg-[var(--border)] transition-colors"
            >
              <div className="flex-shrink-0">{getStatusIcon(activity)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-[var(--text-primary)] truncate">
                    {activity.title}
                  </h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      activity.type === 'chat'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {activity.type}
                  </span>
                </div>

                {activity.preview && (
                  <p className="text-sm text-[var(--text-secondary)] truncate">
                    {activity.preview}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                  <span>{formatTimestamp(activity.timestamp)}</span>
                  {activity.cost && <span>${activity.cost.toFixed(4)}</span>}
                  {activity.tokenCount && (
                    <span>{activity.tokenCount.toLocaleString()} tokens</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActivityHistory;
