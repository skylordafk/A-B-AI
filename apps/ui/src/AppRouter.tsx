import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './ChatPage';
import Batch from './routes/Batch';
import Dashboard from './routes/Dashboard';
import ProjectSettings from './features/settings/ProjectSettings';
import ProjectOnboarding from './components/ProjectOnboarding';
import ProjectDashboard from './components/ProjectDashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { useProjectStore } from './store/projectStore';

// Route guard component to handle project flow
function ProjectRoutes() {
  const { projects, currentProjectId, isLoading } = useProjectStore();

  const hasProjects = projects.length > 0;
  const currentProject = projects.find((p) => p.id === currentProjectId);

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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/settings" element={<ProjectSettings />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
        <ProjectRoutes />
      </ThemeProvider>
    </HashRouter>
  );
}

export default AppRouter;
