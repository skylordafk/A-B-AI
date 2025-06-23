import { useEffect } from 'react';
import { useProjectStore } from './store/projectStore';
import AppRouter from './AppRouter';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const initializeStore = useProjectStore((state) => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;
