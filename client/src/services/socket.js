import { io } from 'socket.io-client';
import { store } from '../store';
import { appendMessage, updateMessage, removeMessage, updateReactions } from '../features/messages/messageSlice';
import { updateChatLastMessage, setTypingUser } from '../features/chat/chatSlice';
import { addNotification } from '../features/notifications/notificationSlice';
import { setActiveCall } from '../features/ui/uiSlice';
import toast from 'react-hot-toast';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('accessToken');

  socket = io(process.env.REACT_APP_WS_URL || '', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Start heartbeat
    setInterval(() => socket.emit('heartbeat'), 25000);
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket disconnected:', reason);
  });

  socket.on('new_message', ({ chatId, message }) => {
    store.dispatch(appendMessage({ chatId, message }));
    store.dispatch(updateChatLastMessage({ chatId, message }));

    const state = store.getState();
    const myId = state.auth.user?._id;
    const activeChatId = state.chat.activeChat?._id?.toString() || state.chat.activeChat?._id;
    const senderId = message.sender?._id?.toString() || message.sender;
    if (senderId !== myId && chatId !== activeChatId) {
      toast(`${message.sender.username}: ${message.content || '📎 Media'}`, {
        icon: '💬',
        duration: 4000,
      });
    }
  });

  socket.on('message_edited', ({ chatId, messageId, content, isEdited }) => {
    store.dispatch(updateMessage({ chatId, messageId, updates: { content, isEdited } }));
  });

  socket.on('message_deleted', ({ chatId, messageId }) => {
    store.dispatch(removeMessage({ chatId, messageId }));
  });

  socket.on('message_reaction', ({ chatId, messageId, reactions }) => {
    store.dispatch(updateReactions({ chatId, messageId, reactions }));
  });

  socket.on('user_typing', ({ chatId, userId }) => {
    store.dispatch(setTypingUser({ chatId, userId, isTyping: true }));
  });

  socket.on('user_stopped_typing', ({ chatId, userId }) => {
    store.dispatch(setTypingUser({ chatId, userId, isTyping: false }));
  });

  socket.on('call:incoming', (callData) => {
    store.dispatch(setActiveCall({ ...callData, direction: 'incoming' }));
    toast(`Incoming ${callData.type} call`, { icon: '📞', duration: 30000 });
  });

  socket.on('reminder_triggered', ({ title }) => {
    store.dispatch(addNotification({ type: 'reminder', title: 'Reminder', body: title, isRead: false, createdAt: new Date() }));
    toast(`⏰ Reminder: ${title}`, { duration: 8000 });
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const emitTypingStart = (chatId) => socket?.emit('typing_start', { chatId });
export const emitTypingStop = (chatId) => socket?.emit('typing_stop', { chatId });
export const emitMessageDelivered = (messageId, chatId) => socket?.emit('message_delivered', { messageId, chatId });
