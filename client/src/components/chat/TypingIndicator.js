import { useSelector } from 'react-redux';

export default function TypingIndicator({ chatId }) {
  const { typingUsers } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const typers = (typingUsers[chatId] || []).filter((id) => id !== user._id);

  if (!typers.length) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex gap-1 items-center bg-surface-800 rounded-2xl rounded-bl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-zinc-500">
        {typers.length === 1 ? 'Someone is typing...' : `${typers.length} people are typing...`}
      </span>
    </div>
  );
}
