import { useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
}

export default function Layout({ children, leftSidebar, rightSidebar }: LayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/chat', label: 'Chat', icon: '💬' },
    { path: '/batch', label: 'Batch', icon: '📝' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Left Sidebar */}
      {leftSidebar && (
        <div
          className={`${
            leftSidebarOpen ? 'w-64' : 'w-0'
          } transition-all duration-300 ease-in-out bg-[var(--bg-secondary)] border-r border-[var(--border)] overflow-hidden flex-shrink-0`}
        >
          <div className="w-64 h-full">{leftSidebar}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle */}
            {leftSidebar && (
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className="p-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white transition-colors"
                title="Toggle left sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Project Info */}
            <div className="text-sm text-[var(--text-secondary)]">
              {currentProject ? (
                <span className="font-medium">{currentProject.name}</span>
              ) : (
                <span>No project selected</span>
              )}
            </div>

            {/* Right Sidebar Toggle */}
            {rightSidebar && (
              <button
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className="p-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white transition-colors"
                title="Toggle right sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </button>
            )}

            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Page Content */}
          <div className="flex-1 overflow-hidden">{children}</div>

          {/* Right Sidebar */}
          {rightSidebar && (
            <div
              className={`${
                rightSidebarOpen ? 'w-80' : 'w-0'
              } transition-all duration-300 ease-in-out bg-[var(--bg-secondary)] border-l border-[var(--border)] overflow-hidden flex-shrink-0`}
            >
              <div className="w-80 h-full">{rightSidebar}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
