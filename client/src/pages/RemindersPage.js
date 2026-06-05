import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Plus, Trash2, Clock } from 'lucide-react';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function RemindersPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', note: '', scheduledAt: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reminders');
      setReminders(data.reminders);
    } catch {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) return;
    setSaving(true);
    try {
      const { data } = await api.post('/reminders', {
        title: form.title,
        note: form.note,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      setReminders((prev) => [...prev, data.reminder]);
      setForm({ title: '', note: '', scheduledAt: '' });
      setShowForm(false);
      toast.success('Reminder set!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      setReminders((prev) => prev.filter((r) => r._id !== id));
      toast.success('Reminder cancelled');
    } catch {
      toast.error('Failed to cancel reminder');
    }
  };

  // Minimum datetime for the picker (now + 1 min)
  const minDatetime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  const upcoming = reminders.filter((r) => !r.isTriggered && !isPast(new Date(r.scheduledAt)));
  const past = reminders.filter((r) => r.isTriggered || isPast(new Date(r.scheduledAt)));

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-800 bg-surface-900">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <Bell size={18} className="text-brand-400" />
        <h1 className="font-semibold text-white">Reminders</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-4 py-4 border-b border-surface-800 bg-surface-900/60">
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Reminder title*"
              className="input-field"
            />
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Note (optional)"
              className="input-field"
            />
            <input
              required
              type="datetime-local"
              min={minDatetime}
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="input-field"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Set Reminder'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Upcoming */}
            <section>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Upcoming ({upcoming.length})
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-4">No upcoming reminders</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((r) => (
                    <div key={r._id} className="flex items-start gap-3 bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 group">
                      <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                        <Clock size={16} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white">{r.title}</p>
                        {r.note && <p className="text-xs text-zinc-500 mt-0.5">{r.note}</p>}
                        <p className="text-xs text-brand-400 mt-1">
                          {format(new Date(r.scheduledAt), 'MMM d, yyyy HH:mm')} ·{' '}
                          {formatDistanceToNow(new Date(r.scheduledAt), { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(r._id)}
                        className="opacity-0 group-hover:opacity-100 transition text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Past ({past.length})
                </h2>
                <div className="space-y-2">
                  {past.map((r) => (
                    <div key={r._id} className="flex items-start gap-3 bg-surface-900/50 border border-surface-800/50 rounded-xl px-4 py-3 opacity-50">
                      <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
                        <Bell size={16} className="text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-zinc-400">{r.title}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {format(new Date(r.scheduledAt), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
