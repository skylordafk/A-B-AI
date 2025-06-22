import { useProjectStore } from '../store/projectStore';
import Layout from '../components/Layout';
import ActivityHistory from '../components/ActivityHistory';
import ActivitySidebar from '../components/sidebars/ActivitySidebar';
import { CostSummaryCard } from '../components/CostSummaryCard';
import { QuickActions } from '../components/QuickActions';
import { ProjectStats } from '../components/ProjectStats';

export function Dashboard() {
  const { projects, currentProjectId } = useProjectStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            No Project Selected
          </h2>
          <p className="text-[var(--text-secondary)]">
            Please select a project to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout rightSidebar={<ActivitySidebar />}>
      <div className="dashboard-container p-6 overflow-auto h-full">
        <h1 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">
          {currentProject.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <CostSummaryCard projectId={currentProject.id} />
          <QuickActions />
          <ProjectStats projectId={currentProject.id} />
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Recent Activity</h2>
          <ActivityHistory projectId={currentProject.id} limit={20} />
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
