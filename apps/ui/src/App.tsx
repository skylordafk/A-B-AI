import { useEffect } from 'react';
import { useProjectStore } from './store/projectStore';
import AppRouter from './AppRouter';

function App() {
  const initialize = useProjectStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <AppRouter />;
}

export default App;
