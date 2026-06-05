import { formatDistanceToNow } from 'date-fns';
import Avatar from '../common/Avatar';

export default function ChatListItem({ chat, isActive, currentUserId, onClick }) {
  const isGroup = chat.type === 'group';
  const otherUser = !isGroup ? chat.participants?.find((p) => p._id !== currentUserId) : null;
  const name = isGroup ? chat.name : otherUser?.username || 'Unknown';
  const avatar = isGroup ? chat.avatar : otherUser?.profile?.avatar;
  const isOnline = !isGroup && otherUser?.presence?.isOnline;

  const myUnread = chat.unreadCounts?.find((u) => u.user === currentUserId);
  const unreadCount = myUnread?.count || 0;

  const lastMsg = chat.lastMessage;
  const lastText = lastMsg
    ? lastMsg.type !== 'text' ? `📎 ${lastMsg.type}` : lastMsg.content
    : 'No messages yet';

  return (
    <div
      onClick={onClick}
      className={`sidebar-item mx-2 my-0.5 ${isActive ? 'sidebar-item-active bg-surface-800' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar src={avatar} name={name} size="md" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-900" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="font-medium text-sm text-white truncate">{name}</span>
          {lastMsg && (
            <span className="text-xs text-zinc-500 flex-shrink-0 ml-1">
              {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-xs text-zinc-500 truncate">{lastText}</p>
          {unreadCount > 0 && (
            <span className="bg-brand-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center flex-shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
