import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Phone, Video, Grid, Sparkles, BarChart2 } from 'lucide-react';
import { getSocket } from '../../services/socket';
import { setActiveCall } from '../../features/ui/uiSlice';
import Avatar from '../common/Avatar';
import Whiteboard from '../whiteboard/Whiteboard';

export default function ChatHeader({ chat, onToggleAI, showAI }) {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const isGroup = chat.type === 'group';
  const otherUser = !isGroup ? chat.participants?.find((p) => p._id !== user._id) : null;
  const name = isGroup ? chat.name : otherUser?.username || 'Unknown';
  const avatar = isGroup ? chat.avatar : otherUser?.profile?.avatar;
  const isOnline = !isGroup && otherUser?.presence?.isOnline;
  const status = isGroup
    ? `${chat.participants?.length || 0} members`
    : isOnline ? 'Online' : 'Offline';

  const handleCall = (type) => {
    const socket = getSocket();
    if (!socket) return;
    dispatch(setActiveCall({ chatId: chat._id, type, direction: 'outgoing' }));
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: type === 'video' })
      .then(() => socket.emit('call:initiate', { chatId: chat._id, type }))
      .catch(() => {});
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-surface-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar src={avatar} name={name} size="md" />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-900" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">{name}</h2>
            <p className="text-xs text-zinc-500">{status}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => handleCall('voice')} className="btn-ghost p-2" title="Voice call">
            <Phone size={18} />
          </button>
          <button onClick={() => handleCall('video')} className="btn-ghost p-2" title="Video call">
            <Video size={18} />
          </button>
          <button
            onClick={() => setShowWhiteboard(true)}
            className="btn-ghost p-2"
            title="Shared whiteboard"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={onToggleAI}
            className={`btn-ghost p-2 ${showAI ? 'text-brand-400' : ''}`}
            title="AI assistant"
          >
            <Sparkles size={18} />
          </button>
          <button
            onClick={() => navigate(`/analytics/${chat._id}`)}
            className="btn-ghost p-2"
            title="Chat analytics"
          >
            <BarChart2 size={18} />
          </button>
        </div>
      </div>

      {showWhiteboard && (
        <Whiteboard chatId={chat._id} onClose={() => setShowWhiteboard(false)} />
      )}
    </>
  );
}
