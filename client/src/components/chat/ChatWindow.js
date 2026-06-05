import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMessages } from '../../features/messages/messageSlice';
import { setActiveChat } from '../../features/chat/chatSlice';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import AIPanel from './AIPanel';
import api from '../../services/api';

export default function ChatWindow() {
  const { chatId } = useParams();
  const dispatch = useDispatch();
  const { chats } = useSelector((s) => s.chat);
  const { byChatId, pagination, loading } = useSelector((s) => s.messages);
  const [showAI, setShowAI] = useState(false);

  const messages = byChatId[chatId] || [];
  const page = pagination[chatId];
  const listRef = useRef(null);

  const chat = chats.find((c) => c._id === chatId);

  useEffect(() => {
    if (chatId) {
      dispatch(fetchMessages({ chatId, page: 1 }));
      dispatch(setActiveChat(chat));
      api.post(`/messages/chat/${chatId}/read`).catch(() => {});
    }
  }, [chatId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const loadMoreMessages = useCallback(() => {
    if (page?.hasMore && !loading) {
      dispatch(fetchMessages({ chatId, page: (page.page || 1) + 1 }));
    }
  }, [page, loading, chatId, dispatch]);

  if (!chat) return null;

  return (
    <div className="flex h-full min-w-0">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0">
        <ChatHeader
          chat={chat}
          onToggleAI={() => setShowAI((v) => !v)}
          showAI={showAI}
        />
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
          onScroll={(e) => {
            if (e.target.scrollTop < 100) loadMoreMessages();
          }}
        >
          {loading && page?.page === 1 && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <MessageList messages={messages} chatId={chatId} chat={chat} />
          <TypingIndicator chatId={chatId} />
        </div>
        <MessageInput chatId={chatId} chat={chat} />
      </div>

      {/* AI Panel — slides in alongside */}
      {showAI && (
        <AIPanel chatId={chatId} onClose={() => setShowAI(false)} />
      )}
    </div>
  );
}
