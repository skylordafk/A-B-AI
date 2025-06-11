import { useState, useEffect } from 'react';
import { registry } from '../metrics/registry';

interface ProjectSettings {
  apiKeys: Record<string, string>;
  enabledMetrics: string[];
  throttleMs: number;
  projectName: string;
}

export default function ProjectSettings() {
  const [settings, setSettings] = useState<ProjectSettings>({
    apiKeys: {},
    enabledMetrics: registry.map(m => m.id),
    throttleMs: 0,
    projectName: 'default',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const projectName = localStorage.getItem('abai_current_project') || 'default';
      const savedSettings = localStorage.getItem(`abai_project_settings_${projectName}`);
      
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Load API keys from main process
        const keys = await window.api.getAllKeys();
        const apiKeys: Record<string, string> = {};
        for (const [provider, keyInfo] of Object.entries(keys)) {
          if (keyInfo?.configured) {
            apiKeys[provider] = '••••••••';
          }
        }
        setSettings(prev => ({
          ...prev,
          apiKeys,
          projectName,
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const projectName = settings.projectName;
      localStorage.setItem('abai_current_project', projectName);
      localStorage.setItem(`abai_project_settings_${projectName}`, JSON.stringify(settings));
      
      // Save API keys to main process if they've been updated
      for (const [provider, key] of Object.entries(settings.apiKeys)) {
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
    setSettings(prev => ({
      ...prev,
      enabledMetrics: prev.enabledMetrics.includes(metricId)
        ? prev.enabledMetrics.filter(id => id !== metricId)
        : [...prev.enabledMetrics, metricId],
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Project Settings</h2>

      {/* Project Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Project Name</label>
        <input
          type="text"
          value={settings.projectName}
          onChange={(e) => setSettings(prev => ({ ...prev, projectName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
                value={settings.apiKeys[provider] || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  apiKeys: { ...prev.apiKeys, [provider]: e.target.value }
                }))}
                placeholder="Enter API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                checked={settings.enabledMetrics.includes(metric.id)}
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
        <label className="block text-sm font-medium mb-2">
          Request Throttle: {settings.throttleMs}ms
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="100"
          value={settings.throttleMs}
          onChange={(e) => setSettings(prev => ({ ...prev, throttleMs: parseInt(e.target.value) }))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>No throttle</span>
          <span>5 seconds</span>
        </div>
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