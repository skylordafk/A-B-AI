import { useEffect } from 'react';
import { useProjectStore } from './store/projectStore';
import AppRouter from './AppRouter';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const initialize = useProjectStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;
