import { useState, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';

interface ProjectStatsProps {
  projectId: string;
}

export function ProjectStats({ projectId }: ProjectStatsProps) {
  const { conversations, batchJobs, messages } = useProjectStore();
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalBatchJobs: 0,
    totalMessages: 0,
    completedJobs: 0,
  });

  useEffect(() => {
    // Calculate stats from store data
    const projectConversations = Array.from(conversations.values()).filter(
      (conv) => conv.projectId === projectId
    );

    const projectBatchJobs = Array.from(batchJobs.values()).filter(
      (job) => job.projectId === projectId
    );

    const projectMessages = Array.from(messages.values()).reduce(
      (total, messageList) => total + messageList.length,
      0
    );

    const completedJobs = projectBatchJobs.filter((job) => job.status === 'completed').length;

    setStats({
      totalConversations: projectConversations.length,
      totalBatchJobs: projectBatchJobs.length,
      totalMessages: projectMessages,
      completedJobs,
    });
  }, [projectId, conversations, batchJobs, messages]);

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Project Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalConversations}</div>
          <div className="text-sm text-[var(--text-secondary)]">Conversations</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalBatchJobs}</div>
          <div className="text-sm text-[var(--text-secondary)]">Batch Jobs</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalMessages}</div>
          <div className="text-sm text-[var(--text-secondary)]">Messages</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.completedJobs}</div>
          <div className="text-sm text-[var(--text-secondary)]">Completed</div>
        </div>
      </div>
    </div>
  );
}
