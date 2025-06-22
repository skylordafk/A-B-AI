import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';

export default function ProjectDashboard() {
  const { projects, currentProject, switchProject, createProject, deleteProject } =
    useProjectStore();
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectDescription('');
      navigate('/settings');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchProject = (projectId: string) => {
    switchProject(projectId);
    navigate('/chat');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Projects</h1>
            <p className="text-[var(--text-secondary)] mt-2">
              Manage your AI projects and switch between different configurations
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            New Project
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Create New Project
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Customer Support Bot"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                }}
                className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`bg-[var(--bg-secondary)] border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                currentProject?.id === project.id
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-[var(--border)] hover:border-blue-300'
              }`}
              onClick={() => handleSwitchProject(project.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      {project.description}
                    </p>
                  )}
                </div>
                {currentProject?.id === project.id && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Current
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>API Keys:</span>
                  <span>{Object.keys(project.apiKeys).length} configured</span>
                </div>
                <div className="flex justify-between">
                  <span>Metrics:</span>
                  <span>{project.enabledMetrics.length} enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last used:</span>
                  <span>{formatDate(project.lastUsed)}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    switchProject(project.id);
                    navigate('/settings');
                  }}
                  className="flex-1 px-3 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded hover:bg-[var(--border)] transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
                      deleteProject(project.id);
                    }
                  }}
                  className="px-3 py-1 text-xs bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)] mb-4">No projects yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
