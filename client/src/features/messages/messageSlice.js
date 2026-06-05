import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchMessages = createAsyncThunk('messages/fetch', async ({ chatId, page = 1 }) => {
  const { data } = await api.get(`/messages/chat/${chatId}?page=${page}`);
  return { chatId, ...data };
});

export const sendMessage = createAsyncThunk('messages/send', async (payload) => {
  const { data } = await api.post('/messages', payload);
  return data.message;
});

const messageSlice = createSlice({
  name: 'messages',
  initialState: {
    // keyed by chatId
    byChatId: {},
    pagination: {},
    loading: false,
  },
  reducers: {
    appendMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.byChatId[chatId]) state.byChatId[chatId] = [];
      const exists = state.byChatId[chatId].some((m) => m._id === message._id);
      if (!exists) state.byChatId[chatId].push(message);
    },
    updateMessage: (state, action) => {
      const { chatId, messageId, updates } = action.payload;
      const msgs = state.byChatId[chatId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m._id === messageId);
      if (idx !== -1) state.byChatId[chatId][idx] = { ...msgs[idx], ...updates };
    },
    removeMessage: (state, action) => {
      const { chatId, messageId } = action.payload;
      if (state.byChatId[chatId]) {
        const idx = state.byChatId[chatId].findIndex((m) => m._id === messageId);
        if (idx !== -1) state.byChatId[chatId][idx].isDeleted = true;
      }
    },
    updateReactions: (state, action) => {
      const { chatId, messageId, reactions } = action.payload;
      const msgs = state.byChatId[chatId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m._id === messageId);
      if (idx !== -1) state.byChatId[chatId][idx].reactions = reactions;
    },
    clearChatMessages: (state, action) => {
      delete state.byChatId[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => { state.loading = true; })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { chatId, messages, pagination } = action.payload;
        if (pagination.page === 1) {
          state.byChatId[chatId] = messages;
        } else {
          // Prepend older messages
          state.byChatId[chatId] = [...messages, ...(state.byChatId[chatId] || [])];
        }
        state.pagination[chatId] = pagination;
        state.loading = false;
      })
      .addCase(fetchMessages.rejected, (state) => { state.loading = false; })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        if (!state.byChatId[msg.chat]) state.byChatId[msg.chat] = [];
        const exists = state.byChatId[msg.chat].some((m) => m._id === msg._id);
        if (!exists) state.byChatId[msg.chat].push(msg);
      });
  },
});

export const { appendMessage, updateMessage, removeMessage, updateReactions, clearChatMessages } = messageSlice.actions;
export default messageSlice.reducer;
