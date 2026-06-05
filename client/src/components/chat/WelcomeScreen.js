import { MessageSquare } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-950 gap-4">
      <div className="w-20 h-20 bg-brand-600/20 rounded-3xl flex items-center justify-center">
        <MessageSquare size={36} className="text-brand-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Welcome to NexChat</h2>
        <p className="text-zinc-500 text-sm mt-1">Select a conversation to start messaging</p>
      </div>
    </div>
  );
}
