import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchChats } from '../features/chat/chatSlice';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import WelcomeScreen from '../components/chat/WelcomeScreen';
import CallModal from '../components/video/CallModal';
import AnalyticsPage from './AnalyticsPage';
import BookmarksPage from './BookmarksPage';
import RemindersPage from './RemindersPage';
import CallHistoryPage from './CallHistoryPage';

export default function ChatLayout() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchChats());
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Routes>
          <Route index element={<WelcomeScreen />} />
          <Route path="chat/:chatId" element={<ChatWindow />} />
          <Route path="analytics/:chatId" element={<AnalyticsPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="calls" element={<CallHistoryPage />} />
        </Routes>
      </main>
      <CallModal />
    </div>
  );
}
