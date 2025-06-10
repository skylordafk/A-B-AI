import ChatPage from './ChatPage';
import BatchPromptPage from './BatchPromptPage';
import { ChatProvider } from './contexts/ChatContext';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <ChatProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/batch" element={<BatchPromptPage />} />
        </Routes>
      </Router>
    </ChatProvider>
  );
}

export default App;
