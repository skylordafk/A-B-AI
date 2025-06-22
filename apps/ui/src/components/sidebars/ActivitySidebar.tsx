import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import ActivityHistory from '../ActivityHistory';

export default function ActivitySidebar() {
  const [activeTab, setActiveTab] = useState<'history' | 'jobs' | 'settings'>('history');
  const { jobs, currentProjectId } = useProjectStore();

  const currentJobs = jobs.filter((j) => j.projectId === currentProjectId);
  const runningJobs = currentJobs.filter((j) => j.status === 'running');
  const recentJobs = currentJobs.slice(0, 5);

  const tabs = [
    { id: 'history' as const, label: 'History', icon: '📚' },
    { id: 'jobs' as const, label: 'Jobs', icon: '⚡', count: runningJobs.length },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto">
            <ActivityHistory />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="h-full overflow-y-auto p-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Batch Jobs</h3>

            {runningJobs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  Running Jobs
                </h4>
                <div className="space-y-2">
                  {runningJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{job.name}</span>
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          Running
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(job.completedCount / job.totalCount) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                          <span>
                            {job.completedCount} of {job.totalCount} completed
                          </span>
                          <span>{Math.round((job.completedCount / job.totalCount) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Recent Jobs</h4>
              {recentJobs.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <p>No batch jobs yet</p>
                  <p className="text-sm mt-1">Create jobs from the Batch page</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{job.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            job.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : job.status === 'failed'
                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-2">
                        {job.completedCount} of {job.totalCount} completed
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Quick Settings
            </h3>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <h4 className="font-medium text-sm mb-2">Theme</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Toggle between light and dark themes using the button in the header.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <h4 className="font-medium text-sm mb-2">Keyboard Shortcuts</h4>
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                  <div>Ctrl/Cmd + Enter: Send message</div>
                  <div>Ctrl/Cmd + N: New conversation</div>
                  <div>Ctrl/Cmd + B: Toggle batch mode</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <h4 className="font-medium text-sm mb-2">Project Info</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Use the navigation tabs to switch between different sections of the application.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
