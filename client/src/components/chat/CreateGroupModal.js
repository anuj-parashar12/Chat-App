import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Search, Check } from 'lucide-react';
import { closeModal } from '../../features/ui/uiSlice';
import { addChat } from '../../features/chat/chatSlice';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function CreateGroupModal() {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await api.get(`/search?q=${q}&type=users`);
    setSearchResults(data.results?.users || []);
  };

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name required'); return; }
    if (selected.length === 0) { toast.error('Add at least one member'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/groups', {
        name,
        description,
        members: selected.map((u) => u._id),
      });
      dispatch(addChat(data.group));
      dispatch(closeModal());
      toast.success('Group created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => dispatch(closeModal())}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
          <h3 className="font-semibold text-white">Create Group</h3>
          <button onClick={() => dispatch(closeModal())} className="btn-ghost p-1"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="input-field"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="input-field"
          />
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(e) => search(e.target.value)} placeholder="Search members..." className="input-field pl-9" />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((u) => (
                <span key={u._id} className="flex items-center gap-1 bg-brand-600/20 text-brand-400 rounded-full px-3 py-1 text-xs">
                  {u.username}
                  <button onClick={() => toggleSelect(u)}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {searchResults.map((u) => {
              const isSelected = selected.find((s) => s._id === u._id);
              return (
                <button key={u._id} onClick={() => toggleSelect(u)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-800 transition text-left"
                >
                  <Avatar src={u.profile?.avatar} name={u.username} size="sm" />
                  <span className="flex-1 text-sm text-white">{u.username}</span>
                  {isSelected && <Check size={16} className="text-brand-400" />}
                </button>
              );
            })}
          </div>

          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
