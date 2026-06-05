import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    rightPanelOpen: false,
    activeModal: null,    // 'createGroup' | 'userSearch' | 'callModal' | etc.
    activeCall: null,
    theme: localStorage.getItem('theme') || 'dark',
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    toggleRightPanel: (state) => { state.rightPanelOpen = !state.rightPanelOpen; },
    openModal: (state, action) => { state.activeModal = action.payload; },
    closeModal: (state) => { state.activeModal = null; },
    setActiveCall: (state, action) => { state.activeCall = action.payload; },
    clearActiveCall: (state) => { state.activeCall = null; },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
  },
});

export const { toggleSidebar, toggleRightPanel, openModal, closeModal, setActiveCall, clearActiveCall, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
