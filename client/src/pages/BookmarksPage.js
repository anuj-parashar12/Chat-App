import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ArrowLeft, Search, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import Avatar from '../components/common/Avatar';
import toast from 'react-hot-toast';

const CATEGORIES = ['all', 'study', 'work', 'personal', 'custom'];

export default function BookmarksPage() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);
      const { data } = await api.get(`/bookmarks?${params}`);
      setBookmarks(data.bookmarks);
    } catch {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') load();
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/bookmarks/${id}`);
      setBookmarks((prev) => prev.filter((b) => b._id !== id));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to remove bookmark');
    }
  };

  const goToChat = (bookmark) => {
    const chatId = bookmark.message?.chat;
    if (chatId) navigate(`/chat/${chatId}`);
  };

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-800 bg-surface-900">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <Bookmark size={18} className="text-brand-400" />
        <h1 className="font-semibold text-white">Saved Messages</h1>
      </div>

      {/* Search + filters */}
      <div className="px-4 py-3 border-b border-surface-800 space-y-3 bg-surface-900/50">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search bookmarks... (Enter)"
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition capitalize ${
                category === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
            <Bookmark size={32} />
            <p className="text-sm">No bookmarks yet</p>
            <p className="text-xs text-zinc-700">Hover over any message and click the bookmark icon</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-800">
            {bookmarks.map((b) => (
              <div key={b._id} className="px-4 py-3 hover:bg-surface-800/30 transition group">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={b.message?.sender?.profile?.avatar}
                    name={b.message?.sender?.username}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-zinc-400">
                        {b.message?.sender?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {b.createdAt && format(new Date(b.createdAt), 'MMM d, HH:mm')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-auto capitalize ${
                        b.category === 'work' ? 'bg-blue-500/20 text-blue-400' :
                        b.category === 'study' ? 'bg-green-500/20 text-green-400' :
                        'bg-surface-700 text-zinc-400'
                      }`}>
                        {b.customCategory || b.category}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {b.message?.type !== 'text' ? `📎 ${b.message?.type}` : b.message?.content}
                    </p>
                    {b.note && (
                      <p className="text-xs text-zinc-500 mt-1 italic">Note: {b.note}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => goToChat(b)}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-800 text-zinc-400 hover:text-white transition"
                  >
                    <ExternalLink size={12} /> Go to message
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-800 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
