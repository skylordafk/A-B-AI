import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';

interface CostSummaryCardProps {
  projectId: string;
}

export function CostSummaryCard({ projectId }: CostSummaryCardProps) {
  const [costData, setCostData] = useState({
    totalCost: 0,
    monthCost: 0,
    weekCost: 0,
    totalMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCostData = async () => {
      try {
        setIsLoading(true);
        const activity = await apiClient.getActivity(projectId);
        setCostData({
          totalCost: activity.totalCost || 0,
          monthCost: activity.monthCost || 0,
          weekCost: activity.weekCost || 0,
          totalMessages: activity.totalMessages || 0,
        });
      } catch (error) {
        console.error('Failed to load cost data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCostData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-300 rounded mb-4"></div>
        <div className="h-8 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Cost Summary</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Total Spent</span>
          <span className="font-semibold text-[var(--text-primary)]">
            ${costData.totalCost.toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">This Month</span>
          <span className="font-semibold text-[var(--text-primary)]">
            ${costData.monthCost.toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">This Week</span>
          <span className="font-semibold text-[var(--text-primary)]">
            ${costData.weekCost.toFixed(4)}
          </span>
        </div>

        <div className="border-t border-[var(--border)] pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">Total Messages</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {costData.totalMessages.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
