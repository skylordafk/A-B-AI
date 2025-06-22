import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';

export function QuickActions() {
  const navigate = useNavigate();
  const { createConversation, createProject } = useProjectStore();

  const handleNewChat = async () => {
    try {
      await createConversation('New Conversation');
      navigate('/chat');
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleNewBatch = () => {
    navigate('/batch');
  };

  const handleNewProject = async () => {
    try {
      const projectName = prompt('Enter project name:');
      if (projectName) {
        await createProject(projectName);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Quick Actions</h3>

      <div className="space-y-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Start New Chat
        </button>

        <button
          onClick={handleNewBatch}
          className="w-full flex items-center gap-3 p-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0h2a2 2 0 012 2v6a2 2 0 01-2 2m-6 0a2 2 0 002-2v-6a2 2 0 012-2m-2 2h2m-2 0v6a2 2 0 002 2h2"
            />
          </svg>
          Create Batch Job
        </button>

        <button
          onClick={handleNewProject}
          className="w-full flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          New Project
        </button>
      </div>
    </div>
  );
}
