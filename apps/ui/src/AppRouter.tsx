import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './ChatPage';
import Batch from './routes/Batch';
import ProjectSettings from './features/settings/ProjectSettings';
import ProjectOnboarding from './components/ProjectOnboarding';
import ProjectDashboard from './components/ProjectDashboard';
import Activate from './features/licensing/Activate';
import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProjectProvider, useProject } from './contexts/ProjectContext';

// Route guard component to handle project flow
function ProjectRoutes() {
  const { hasProjects, currentProject, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-primary)]">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Licensing routes - always accessible (must be first) */}
      <Route path="/activate" element={<Activate />} />
      <Route
        path="/activate-success"
        element={
          <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                License Activated!
              </h1>
              <p className="text-[var(--text-secondary)] mb-6">
                Your A-B/AI license has been successfully activated.
              </p>
              <button
                onClick={() => (window.location.hash = '/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continue to App
              </button>
            </div>
          </div>
        }
      />

      {/* Project management routes - always accessible */}
      <Route path="/onboarding" element={<ProjectOnboarding />} />
      <Route path="/projects" element={<ProjectDashboard />} />

      {/* Protected routes - require a project */}
      {hasProjects && currentProject && (
        <>
          <Route
            path="/chat"
            element={
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            }
          />
          <Route path="/batch" element={<Batch />} />
          <Route path="/settings" element={<ProjectSettings />} />
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </>
      )}

      {/* Fallback routes (must be last) */}
      {hasProjects && !currentProject && (
        <Route path="*" element={<Navigate to="/projects" replace />} />
      )}
      {!hasProjects && <Route path="*" element={<Navigate to="/onboarding" replace />} />}
    </Routes>
  );
}

function AppRouter() {
  return (
    <HashRouter>
      <ThemeProvider>
        <ProjectProvider>
          <ProjectRoutes />
        </ProjectProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default AppRouter;
