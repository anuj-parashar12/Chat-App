import { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Paperclip, Lock } from 'lucide-react';
import { sendMessage } from '../../features/messages/messageSlice';
import { emitTypingStart, emitTypingStop } from '../../services/socket';
import { useE2EE } from '../../hooks/useE2EE';
import { useDropzone } from 'react-dropzone';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MessageInput({ chatId, chat }) {
  const dispatch = useDispatch();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const typingTimer = useRef(null);
  const { user } = useSelector((s) => s.auth);
  const { encryptForUser } = useE2EE();

  // For direct chats: get the other participant's public key for E2EE
  const isE2EE = chat?.isE2EE;
  const otherParticipant = chat?.type === 'direct'
    ? chat?.participants?.find((p) => (p._id || p) !== user?._id)
    : null;

  const handleTyping = (value) => {
    setText(value);
    emitTypingStart(chatId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTypingStop(chatId), 1500);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    emitTypingStop(chatId);
    clearTimeout(typingTimer.current);

    try {
      let payload = { chatId, content, type: 'text' };

      // E2EE: encrypt for the other participant if the chat has E2EE enabled
      if (isE2EE && otherParticipant?.publicKey) {
        const encrypted = await encryptForUser(
          content,
          otherParticipant._id,
          otherParticipant.publicKey
        );
        payload = { ...payload, ...encrypted };
      }

      await dispatch(sendMessage(payload)).unwrap();
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    try {
      await api.post(`/media/upload/${chatId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          const pct = Math.round((p.loaded * 100) / p.total);
          toast.loading(`Uploading... ${pct}%`, { id: 'upload' });
        },
      });
      toast.success('File sent!', { id: 'upload' });
    } catch {
      toast.error('Upload failed', { id: 'upload' });
    } finally {
      setUploading(false);
    }
  }, [chatId]);

  const { getInputProps, open } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  return (
    <div className="px-4 py-3 border-t border-surface-800 bg-surface-900">
      <input {...getInputProps()} />
      {isE2EE && (
        <div className="flex items-center gap-1 mb-2 text-xs text-green-400">
          <Lock size={11} />
          <span>End-to-end encrypted</span>
        </div>
      )}
      <div className="flex items-end gap-2 bg-surface-800 rounded-2xl px-3 py-2">
        <button
          onClick={open}
          className="p-1.5 text-zinc-500 hover:text-white transition flex-shrink-0"
          disabled={uploading}
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-32 leading-relaxed"
          style={{ height: 'auto' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || uploading}
          className="p-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
      {uploading && (
        <div className="mt-2 h-1 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}
