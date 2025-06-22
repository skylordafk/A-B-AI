import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './ChatPage';
import Batch from './routes/Batch';
import ProjectSettings from './features/settings/ProjectSettings';
import ProjectOnboarding from './components/ProjectOnboarding';
import ProjectDashboard from './components/ProjectDashboard';
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
          <Route
            path="/batch"
            element={
              <ChatProvider>
                <Batch />
              </ChatProvider>
            }
          />
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
