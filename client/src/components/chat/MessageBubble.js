import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import { Bookmark, Smile, Check, CheckCheck, Lock } from 'lucide-react';
import api from '../../services/api';
import { updateReactions } from '../../features/messages/messageSlice';
import { useE2EE } from '../../hooks/useE2EE';
import Avatar from '../common/Avatar';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const ReadStatus = ({ message, isOwn }) => {
  if (!isOwn) return null;
  const readCount = message.readBy?.length || 0;
  return readCount > 0
    ? <CheckCheck size={12} className="text-brand-400" />
    : <Check size={12} className="text-zinc-500" />;
};

export default function MessageBubble({ message, isOwn, chatId, senderPublicKey }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [displayContent, setDisplayContent] = useState(message.content || '');
  const { decryptFromUser } = useE2EE();

  // Decrypt message content if it was encrypted
  useEffect(() => {
    if (!message.isEncrypted || !message.content) {
      setDisplayContent(message.content || '');
      return;
    }
    const senderId = message.sender?._id || message.sender;
    const pubKey = senderPublicKey || message.sender?.publicKey;
    if (!pubKey) { setDisplayContent('[Encrypted message]'); return; }

    decryptFromUser(message.content, senderId, pubKey)
      .then(setDisplayContent)
      .catch(() => setDisplayContent('[Encrypted message]'));
  }, [message.content, message.isEncrypted, senderPublicKey]);

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
        <p className="text-xs text-zinc-600 italic px-3 py-1.5 bg-surface-800/50 rounded-2xl">
          Message deleted
        </p>
      </div>
    );
  }

  const handleReact = async (emoji) => {
    try {
      const { data } = await api.post(`/messages/${message._id}/react`, { emoji });
      dispatch(updateReactions({ chatId, messageId: message._id, reactions: data.reactions }));
    } catch {}
    setShowReactions(false);
  };

  const handleBookmark = async () => {
    try {
      await api.post('/bookmarks', { messageId: message._id });
    } catch {}
  };

  return (
    <div
      className={`group flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {!isOwn && (
        <Avatar src={message.sender?.profile?.avatar} name={message.sender?.username} size="xs" />
      )}

      <div className={`max-w-xs lg:max-w-md relative ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && (
          <p className="text-xs text-zinc-500 mb-1 ml-1">{message.sender?.username}</p>
        )}

        {message.replyTo && (
          <div className="bg-surface-700/50 border-l-2 border-brand-500 rounded px-2 py-1 mb-1 text-xs text-zinc-400 max-w-full truncate">
            {message.replyTo.content}
          </div>
        )}

        <div className={isOwn ? 'message-bubble-mine' : 'message-bubble-other'}>
          {message.type === 'text' && (
            <div className="flex items-start gap-1">
              {message.isEncrypted && <Lock size={10} className="text-green-400 mt-1 flex-shrink-0" />}
              <p className="text-sm leading-relaxed break-words">{displayContent}</p>
            </div>
          )}
          {message.type === 'image' && (
            <img
              src={message.media?.url}
              alt="shared"
              className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(message.media?.url, '_blank')}
            />
          )}
          {(message.type === 'file' || message.type === 'audio' || message.type === 'video') && (
            <a
              href={message.media?.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm underline"
            >
              📎 {message.media?.name || 'Download file'}
            </a>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs opacity-60">{format(new Date(message.createdAt), 'HH:mm')}</span>
            {message.isEdited && <span className="text-xs opacity-40">(edited)</span>}
            <ReadStatus message={message} isOwn={isOwn} />
          </div>
        </div>

        {message.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className="bg-surface-800 border border-surface-700 rounded-full px-2 py-0.5 text-xs hover:bg-surface-700 transition"
              >
                {r.emoji} {r.users?.length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 rounded-lg hover:bg-surface-800 text-zinc-500 hover:text-white transition"
            >
              <Smile size={14} />
            </button>
            {showReactions && (
              <div className={`absolute bottom-8 ${isOwn ? 'right-0' : 'left-0'} bg-surface-800 border border-surface-700 rounded-2xl px-3 py-2 flex gap-2 shadow-xl z-10`}>
                {REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => handleReact(emoji)} className="text-lg hover:scale-125 transition-transform">
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleBookmark} className="p-1.5 rounded-lg hover:bg-surface-800 text-zinc-500 hover:text-white transition">
            <Bookmark size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
