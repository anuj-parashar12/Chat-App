import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video, ArrowLeft, PhoneIncoming, PhoneMissed, PhoneOutgoing } from 'lucide-react';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import { useSelector } from 'react-redux';
import api from '../services/api';
import Avatar from '../components/common/Avatar';

const CallIcon = ({ call, currentUserId }) => {
  const isInitiator = call.initiator?._id === currentUserId;
  const myStatus = call.participants?.find((p) => p.user?._id === currentUserId)?.status;

  if (call.status === 'missed' || myStatus === 'missed') return <PhoneMissed size={16} className="text-red-400" />;
  if (isInitiator) return <PhoneOutgoing size={16} className="text-brand-400" />;
  return <PhoneIncoming size={16} className="text-green-400" />;
};

const formatCallDuration = (seconds) => {
  if (!seconds) return 'No answer';
  const d = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(d, { format: ['hours', 'minutes', 'seconds'] }) || '< 1s';
};

export default function CallHistoryPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/calls/history?page=${p}&limit=20`);
      if (p === 1) {
        setCalls(data.calls);
      } else {
        setCalls((prev) => [...prev, ...data.calls]);
      }
      setHasMore(data.calls.length === 20);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-800 bg-surface-900">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <Phone size={18} className="text-brand-400" />
        <h1 className="font-semibold text-white">Call History</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && calls.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
            <Phone size={32} />
            <p className="text-sm">No calls yet</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-800/50">
            {calls.map((call) => {
              const other = call.participants?.find((p) => p.user?._id !== user._id)?.user;
              return (
                <div key={call._id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800/30 transition">
                  <Avatar src={other?.profile?.avatar} name={other?.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white">{other?.username || 'Group call'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <CallIcon call={call} currentUserId={user._id} />
                      <span className="text-xs text-zinc-500">
                        {formatCallDuration(call.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-zinc-500 justify-end">
                      {call.type === 'video' ? <Video size={13} /> : <Phone size={13} />}
                      <span className="text-xs capitalize">{call.type}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {call.createdAt && format(new Date(call.createdAt), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={() => { const next = page + 1; setPage(next); load(next); }}
                className="w-full text-sm text-brand-400 py-3 hover:bg-surface-800/30 transition"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
