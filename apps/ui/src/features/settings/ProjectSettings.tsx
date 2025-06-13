import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registry } from '../metrics/registry';
import { useProject } from '../../contexts/ProjectContext';
import ChatHistory from '../../components/ChatHistory';
import BatchHistory from '../../components/BatchHistory';

export default function ProjectSettings() {
  const { currentProject, updateProject } = useProject();
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [enabledMetrics, setEnabledMetrics] = useState<string[]>(registry.map((m) => m.id));
  const [throttleMs, setThrottleMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect if no current project
  useEffect(() => {
    if (!currentProject && !loading) {
      navigate('/projects');
    }
  }, [currentProject, loading, navigate]);

  useEffect(() => {
    loadSettings();
  }, [currentProject]);

  const loadSettings = async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      // Load from project data
      setApiKeys(currentProject.apiKeys);
      setEnabledMetrics(currentProject.enabledMetrics);
      setThrottleMs(currentProject.throttleMs);

      // Load current API key status from main process
      const keys = await window.api.getAllKeys();
      const currentApiKeys: Record<string, string> = { ...currentProject.apiKeys };
      Object.entries(keys).forEach(([provider, keyInfo]) => {
        if (keyInfo && keyInfo.configured) {
          // Show masked key if configured in main process
          currentApiKeys[provider] = currentApiKeys[provider] || '••••••••';
        }
      });
      setApiKeys(currentApiKeys);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!currentProject) return;

    setSaving(true);
    try {
      // Update project in context
      updateProject(currentProject.id, {
        apiKeys,
        enabledMetrics,
        throttleMs,
      });

      // Save API keys to main process if they've been updated
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key && !key.includes('•')) {
          await window.api.saveApiKeyForProvider(provider as any, key);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleMetric = (metricId: string) => {
    setEnabledMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">No project selected</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Project Settings</h2>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)]"
        >
          Switch Project
        </button>
      </div>

      {/* Project Info */}
      <div className="mb-6 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          {currentProject.name}
        </h3>
        {currentProject.description && (
          <p className="text-sm text-[var(--text-secondary)]">{currentProject.description}</p>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Created: {new Date(currentProject.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* API Keys */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">API Keys</h3>
        <div className="space-y-3">
          {['openai', 'anthropic', 'gemini', 'grok'].map((provider) => (
            <div key={provider}>
              <label className="block text-sm font-medium mb-1 capitalize">{provider}</label>
              <input
                type="password"
                value={apiKeys[provider] || ''}
                onChange={(e) =>
                  setApiKeys((prev) => ({
                    ...prev,
                    [provider]: e.target.value,
                  }))
                }
                placeholder="Enter API key"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Metric Toggles */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Enabled Metrics</h3>
        <div className="space-y-2">
          {registry.map((metric) => (
            <label key={metric.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enabledMetrics.includes(metric.id)}
                onChange={() => toggleMetric(metric.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm">{metric.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Throttle Slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
          Request Throttle: {throttleMs}ms
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="100"
          value={throttleMs}
          onChange={(e) => setThrottleMs(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>No throttle</span>
          <span>5 seconds</span>
        </div>
      </div>

      {/* Usage History */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Usage History
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Batch processing history is automatically logged to:
          </p>
          <div className="flex items-center gap-2 mb-2">
            <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded flex-1">
              ~/.abai/history/{currentProject.name}.jsonl
            </code>
            <button
              onClick={() => {
                // This will need an IPC call to open the folder
                if (window.api?.openHistoryFolder) {
                  window.api.openHistoryFolder(currentProject.name);
                } else {
                  // Fallback: copy path to clipboard
                  const path = `~/.abai/history/${currentProject.name}.jsonl`;
                  navigator.clipboard.writeText(path).then(() => {
                    alert('Path copied to clipboard!');
                  });
                }
              }}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Open Folder
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Each line contains a JSON record with prompt, response, cost, and timing data. You can
            open this file with any text editor or data analysis tool.
          </p>
        </div>
      </div>

      {/* Chat History */}
      <div className="mb-6">
        <ChatHistory />
      </div>

      {/* Batch History */}
      <div className="mb-6">
        <BatchHistory />
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
