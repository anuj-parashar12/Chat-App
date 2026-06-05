import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchChats = createAsyncThunk('chat/fetchAll', async () => {
  const { data } = await api.get('/chats');
  return data.chats;
});

export const createDirectChat = createAsyncThunk('chat/createDirect', async (userId) => {
  const { data } = await api.post('/chats/direct', { userId });
  return data.chat;
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    activeChat: null,
    typingUsers: {},   // { chatId: [userId, ...] }
    loading: false,
  },
  reducers: {
    setActiveChat: (state, action) => { state.activeChat = action.payload; },
    updateChatLastMessage: (state, action) => {
      const { chatId, message } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) chat.lastMessage = message;
      // Bubble to top
      state.chats = [
        ...(chat ? [chat] : []),
        ...state.chats.filter((c) => c._id !== chatId),
      ];
    },
    setTypingUser: (state, action) => {
      const { chatId, userId, isTyping } = action.payload;
      if (!state.typingUsers[chatId]) state.typingUsers[chatId] = [];
      if (isTyping) {
        if (!state.typingUsers[chatId].includes(userId)) {
          state.typingUsers[chatId].push(userId);
        }
      } else {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter((id) => id !== userId);
      }
    },
    incrementUnread: (state, action) => {
      const { chatId } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        const uc = chat.unreadCounts?.find((u) => u.user === action.payload.userId);
        if (uc) uc.count += 1;
      }
    },
    resetUnread: (state, action) => {
      const { chatId, userId } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        const uc = chat.unreadCounts?.find((u) => u.user === userId);
        if (uc) uc.count = 0;
      }
    },
    addChat: (state, action) => {
      if (!state.chats.find((c) => c._id === action.payload._id)) {
        state.chats.unshift(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => { state.loading = true; })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.chats = action.payload;
        state.loading = false;
      })
      .addCase(fetchChats.rejected, (state) => { state.loading = false; })
      .addCase(createDirectChat.fulfilled, (state, action) => {
        if (!state.chats.find((c) => c._id === action.payload._id)) {
          state.chats.unshift(action.payload);
        }
        state.activeChat = action.payload;
      });
  },
});

export const {
  setActiveChat, updateChatLastMessage, setTypingUser,
  incrementUnread, resetUnread, addChat,
} = chatSlice.actions;
export default chatSlice.reducer;
