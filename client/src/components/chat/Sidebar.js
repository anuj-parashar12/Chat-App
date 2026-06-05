import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search, Plus, Bell, LogOut, MessageSquare,
  Users, Bookmark, Clock, Phone, BarChart2,
} from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import { setActiveChat } from '../../features/chat/chatSlice';
import { openModal } from '../../features/ui/uiSlice';
import ChatListItem from './ChatListItem';
import UserSearchModal from './UserSearchModal';
import CreateGroupModal from './CreateGroupModal';
import NotificationPanel from '../common/NotificationPanel';
import Avatar from '../common/Avatar';

const NAV_ITEMS = [
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  { icon: Clock, label: 'Reminders', path: '/reminders' },
  { icon: Phone, label: 'Call History', path: '/calls' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { user } = useSelector((s) => s.auth);
  const { chats } = useSelector((s) => s.chat);
  const { activeModal } = useSelector((s) => s.ui);
  const { unreadCount } = useSelector((s) => s.notifications);
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const filtered = chats.filter((c) => {
    const name = c.type === 'group'
      ? c.name
      : c.participants?.find((p) => p._id !== user._id)?.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleChatClick = (chat) => {
    dispatch(setActiveChat(chat));
    navigate(`/chat/${chat._id}`);
  };

  return (
    <>
      <aside className="w-72 flex flex-col bg-surface-900 border-r border-surface-800 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">NexChat</span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn-ghost p-2 relative"
              title="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-600 rounded-full text-[10px] text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => dispatch(openModal('createGroup'))} className="btn-ghost p-2" title="New group">
              <Users size={17} />
            </button>
            <button onClick={() => dispatch(openModal('userSearch'))} className="btn-ghost p-2" title="New chat">
              <Plus size={17} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-field pl-8 text-sm py-2"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && !search ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-700">
              <MessageSquare size={20} />
              <p className="text-xs">Start a conversation</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-zinc-600 text-xs py-8">No results</p>
          ) : (
            filtered.map((chat) => (
              <ChatListItem
                key={chat._id}
                chat={chat}
                isActive={chat._id === chatId}
                currentUserId={user._id}
                onClick={() => handleChatClick(chat)}
              />
            ))
          )}
        </div>

        {/* Bottom nav: bookmarks, reminders, calls */}
        <div className="border-t border-surface-800 px-2 py-2">
          <div className="flex gap-1 mb-2">
            {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={label}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-zinc-500 hover:text-white hover:bg-surface-800 transition text-xs"
              >
                <Icon size={16} />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User footer */}
        <div className="flex items-center gap-2.5 px-3 py-3 border-t border-surface-800">
          <Avatar src={user?.profile?.avatar} name={user?.username} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.profile?.displayName || user?.username}
            </p>
            <p className="text-[10px] text-green-400">Online</p>
          </div>
          <button
            onClick={() => dispatch(logout())}
            className="btn-ghost p-1.5 text-zinc-500 hover:text-red-400"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
      {activeModal === 'userSearch' && <UserSearchModal />}
      {activeModal === 'createGroup' && <CreateGroupModal />}
    </>
  );
}
