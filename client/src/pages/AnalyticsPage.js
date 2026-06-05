import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { MessageSquare, Phone, Image, TrendingUp, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartDefaults = {
  responsive: true,
  plugins: { legend: { labels: { color: '#a1a1aa' } } },
  scales: {
    x: { ticks: { color: '#71717a' }, grid: { color: '#27272a' } },
    y: { ticks: { color: '#71717a' }, grid: { color: '#27272a' } },
  },
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'brand' }) => (
  <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
      <Icon size={22} className={`text-${color}-400`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-sm text-zinc-400">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function AnalyticsPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats } = useSelector((s) => s.chat);
  const chat = chats.find((c) => c._id === chatId);
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    api.get(`/analytics/${chatId}?days=${days}`)
      .then(({ data: res }) => setData(res.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chatId, days]);

  const msgPerDayLabels = data ? Object.keys(data.messagesPerDay).sort() : [];
  const msgPerDayValues = msgPerDayLabels.map((d) => data.messagesPerDay[d]);
  const totalMessages = msgPerDayValues.reduce((a, b) => a + b, 0);

  const mediaBreakdown = data?.media || [];
  const mediaLabels = mediaBreakdown.map((m) => m._id);
  const mediaCounts = mediaBreakdown.map((m) => m.count);

  const userLabels = data ? Object.keys(data.perUser) : [];
  const userCounts = userLabels.map((id) => data.perUser[id]);

  return (
    <div className="flex flex-col h-full bg-surface-950 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-800 bg-surface-900 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-semibold text-white">Analytics</h1>
          <p className="text-xs text-zinc-500">{chat?.name || 'Conversation'}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${days === d ? 'bg-brand-600 text-white' : 'bg-surface-800 text-zinc-400 hover:text-white'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={MessageSquare} label="Total Messages" value={totalMessages} sub={`Last ${days} days`} color="brand" />
            <StatCard icon={Phone} label="Total Calls" value={data?.calls?.totalCalls ?? 0} sub={`${Math.round((data?.calls?.totalDuration || 0) / 60)} min total`} color="green" />
            <StatCard icon={Image} label="Media Shared" value={mediaCounts.reduce((a, b) => a + b, 0)} color="orange" />
            <StatCard icon={TrendingUp} label="Most Active" value={data?.mostActiveUser?.count ?? 0} sub="messages by top user" color="purple" />
          </div>

          {/* Messages per day */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-400" />
              Messages per Day
            </h3>
            {msgPerDayLabels.length > 0 ? (
              <Bar
                data={{
                  labels: msgPerDayLabels,
                  datasets: [{
                    label: 'Messages',
                    data: msgPerDayValues,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                  }],
                }}
                options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, title: { display: false } } }}
              />
            ) : (
              <p className="text-zinc-500 text-sm text-center py-8">No message data for this period</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Per-user breakdown */}
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Users size={16} className="text-purple-400" />
                Messages by User
              </h3>
              {userLabels.length > 0 ? (
                <Doughnut
                  data={{
                    labels: userLabels.map((id) => id.slice(-6)),
                    datasets: [{
                      data: userCounts,
                      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
                      borderWidth: 0,
                    }],
                  }}
                  options={{ responsive: true, plugins: { legend: { labels: { color: '#a1a1aa' }, position: 'bottom' } } }}
                />
              ) : (
                <p className="text-zinc-500 text-sm text-center py-8">No user data</p>
              )}
            </div>

            {/* Media types */}
            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Image size={16} className="text-orange-400" />
                Media Types Shared
              </h3>
              {mediaLabels.length > 0 ? (
                <Bar
                  data={{
                    labels: mediaLabels,
                    datasets: [{
                      label: 'Count',
                      data: mediaCounts,
                      backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ef4444'],
                      borderRadius: 4,
                    }],
                  }}
                  options={{
                    ...chartDefaults,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                  }}
                />
              ) : (
                <p className="text-zinc-500 text-sm text-center py-8">No media shared</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
