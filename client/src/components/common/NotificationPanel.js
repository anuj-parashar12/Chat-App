import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, Bell } from 'lucide-react';
import { setNotifications, markAllRead } from '../../features/notifications/notificationSlice';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationPanel({ onClose }) {
  const dispatch = useDispatch();
  const { items, unreadCount } = useSelector((s) => s.notifications);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => {
      dispatch(setNotifications({ notifications: data.notifications, unreadCount: data.unreadCount }));
    });
  }, [dispatch]);

  const handleMarkAll = async () => {
    await api.patch('/notifications/read-all');
    dispatch(markAllRead());
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-surface-900 border-l border-surface-800 shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-brand-400" />
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-brand-600 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} className="text-xs text-brand-400 hover:text-brand-300">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-600">
            <Bell size={24} />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          items.map((n, i) => (
            <div
              key={i}
              className={`px-4 py-3 border-b border-surface-800/50 transition hover:bg-surface-800/30 ${!n.isRead ? 'bg-brand-600/5' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 flex-shrink-0">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{n.body}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
