import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, FileText, Zap, Loader } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AIMessage = ({ msg }) => (
  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
    {msg.role === 'assistant' && (
      <div className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
        <Sparkles size={12} className="text-brand-400" />
      </div>
    )}
    <div
      className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
        msg.role === 'user'
          ? 'bg-brand-600 text-white rounded-br-sm'
          : 'bg-surface-800 text-zinc-200 rounded-bl-sm'
      }`}
    >
      {msg.content}
    </div>
  </div>
);

export default function AIPanel({ chatId, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your NexChat AI. I can summarize this conversation, suggest replies, or answer any questions.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    setSmartReplies([]);
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { message: userMsg, chatId });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const summarize = async () => {
    setSummarizing(true);
    try {
      const { data } = await api.post(`/ai/summarize/${chatId}`);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `📋 **Summary:**\n${data.summary}`,
      }]);
    } catch {
      toast.error('Summarization failed — check your OpenAI key');
    } finally {
      setSummarizing(false);
    }
  };

  const getSmartReplies = async (messageId) => {
    try {
      const { data } = await api.post('/ai/smart-replies', { messageId });
      setSmartReplies(data.replies || []);
    } catch {}
  };

  return (
    <div className="w-80 flex flex-col bg-surface-900 border-l border-surface-800 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <Sparkles size={14} className="text-brand-400" />
          </div>
          <span className="font-semibold text-sm text-white">AI Assistant</span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1"><X size={14} /></button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-3 py-2 border-b border-surface-800">
        <button
          onClick={summarize}
          disabled={summarizing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-800 hover:bg-surface-700 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-50"
        >
          {summarizing ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
          Summarize
        </button>
        <button
          onClick={() => send('What are the key topics discussed in this conversation?')}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-800 hover:bg-surface-700 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-50"
        >
          <Zap size={12} />
          Key topics
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.map((msg, i) => <AIMessage key={i} msg={msg} />)}
        {loading && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} className="text-brand-400" />
            </div>
            <div className="bg-surface-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Smart reply chips */}
        {smartReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => send(reply)}
                className="text-xs px-3 py-1.5 bg-brand-600/20 border border-brand-600/30 text-brand-300 rounded-full hover:bg-brand-600/30 transition"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-surface-800">
        <div className="flex items-center gap-2 bg-surface-800 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 transition"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
