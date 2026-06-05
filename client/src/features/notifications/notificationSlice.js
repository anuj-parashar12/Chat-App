import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    setNotifications: (state, action) => {
      state.items = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
    },
    markAllRead: (state) => {
      state.items.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },
  },
});

export const { addNotification, setNotifications, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
