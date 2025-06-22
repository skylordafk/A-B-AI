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

  // Debug logging to help troubleshoot navigation issues
  console.debug('[Router] State:', {
    hasProjects,
    currentProjectId,
    currentProject: !!currentProject,
    isLoading,
    projectCount: projects.length,
  });

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
      {hasProjects && currentProject ? (
        <>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/settings" element={<ProjectSettings />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      ) : hasProjects && !currentProject ? (
        /* Has projects but no current project selected */
        <Route path="*" element={<Navigate to="/projects" replace />} />
      ) : (
        /* No projects exist */
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      )}
    </Routes>
  );
}

function AppRouter() {
  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <ProjectRoutes />
      </ThemeProvider>
    </HashRouter>
  );
}

export default AppRouter;
