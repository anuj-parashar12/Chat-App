import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Search, X } from 'lucide-react';
import { closeModal } from '../../features/ui/uiSlice';
import { createDirectChat } from '../../features/chat/chatSlice';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import { useNavigate } from 'react-router-dom';

export default function UserSearchModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/search?q=${q}&type=users`);
      setResults(data.results?.users || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (userId) => {
    const result = await dispatch(createDirectChat(userId)).unwrap();
    dispatch(closeModal());
    navigate(`/chat/${result._id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => dispatch(closeModal())}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
          <h3 className="font-semibold text-white">New Conversation</h3>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1"><X size={16} /></button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search users..."
              className="input-field pl-9"
            />
          </div>
          <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
            {loading && <p className="text-center text-zinc-500 text-sm py-4">Searching...</p>}
            {!loading && results.map((u) => (
              <button
                key={u._id}
                onClick={() => handleSelect(u._id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-800 transition text-left"
              >
                <Avatar src={u.profile?.avatar} name={u.username} size="sm" />
                <div>
                  <p className="font-medium text-sm text-white">{u.username}</p>
                  {u.presence?.isOnline && <p className="text-xs text-green-400">Online</p>}
                </div>
              </button>
            ))}
            {!loading && query.length >= 2 && !results.length && (
              <p className="text-center text-zinc-500 text-sm py-4">No users found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
