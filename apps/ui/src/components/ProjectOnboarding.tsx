import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

export default function ProjectOnboarding() {
  const { createProject } = useProject();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    setIsCreating(true);
    try {
      createProject(projectName.trim(), description.trim() || undefined);
      // Navigate to project settings to set up API keys
      navigate('/settings');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Welcome to A-B/AI</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Let's create your first project to get started with AI model comparison and batch
            processing.
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
            Create Your First Project
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Marketing Content Analysis"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you'll use this project for..."
                rows={3}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || isCreating}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isCreating ? 'Creating Project...' : 'Create Project & Set Up API Keys'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              What happens next?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Set up your API keys for AI providers</li>
              <li>• Configure metrics and request throttling</li>
              <li>• Start comparing AI models or running batch processes</li>
              <li>• View usage history and costs per project</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Projects help you organize your work, track costs, and maintain separate configurations
            for different use cases.
          </p>
        </div>
      </div>
    </div>
  );
}
