import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './ChatPage';
import Batch from './routes/Batch';
import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppRouter() {
  return (
    <HashRouter>
      <ThemeProvider>
        <Routes>
          <Route
            path="/chat"
            element={
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            }
          />
          <Route path="/batch" element={<Batch />} />
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
      </ThemeProvider>
    </HashRouter>
  );
}

export default AppRouter;
