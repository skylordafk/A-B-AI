import React from 'react';
import { registry } from './registry';

interface DiffRow {
  id: string;
  prompt: string;
  v1Result: string;
  v2Result: string;
  metrics: Record<string, number>;
  timestamp: number;
}

interface DiffViewerProps {
  diffs: DiffRow[];
}

export default function DiffViewer({ diffs }: DiffViewerProps) {
  const getMetricColor = (value: number, metricId: string) => {
    // For similarity, higher is better
    if (metricId === 'similarity') {
      if (value >= 0.9) return 'bg-green-100 text-green-800';
      if (value >= 0.7) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    }
    
    // For cost and latency, lower is better
    if (metricId === 'cost' || metricId === 'latency') {
      if (value <= 0.1) return 'bg-green-100 text-green-800';
      if (value <= 0.5) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  const formatMetricValue = (value: number, metricId: string) => {
    if (metricId === 'similarity') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (metricId === 'cost') {
      return `$${value.toFixed(4)}`;
    }
    if (metricId === 'latency') {
      return `${value.toFixed(0)}ms`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prompt
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              V1 → V2
            </th>
            {registry.map((metric) => (
              <th
                key={metric.id}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {metric.label}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {diffs.map((diff) => (
            <tr key={diff.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <div className="max-w-xs truncate" title={diff.prompt}>
                  {diff.prompt}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <div className="space-y-2">
                  <div className="max-w-md">
                    <span className="font-medium text-gray-700">V1:</span>
                    <p className="text-xs truncate" title={diff.v1Result}>
                      {diff.v1Result}
                    </p>
                  </div>
                  <div className="max-w-md">
                    <span className="font-medium text-gray-700">V2:</span>
                    <p className="text-xs truncate" title={diff.v2Result}>
                      {diff.v2Result}
                    </p>
                  </div>
                </div>
              </td>
              {registry.map((metric) => (
                <td key={metric.id} className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMetricColor(
                      diff.metrics[metric.id] || 0,
                      metric.id
                    )}`}
                  >
                    {formatMetricValue(diff.metrics[metric.id] || 0, metric.id)}
                  </span>
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(diff.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 