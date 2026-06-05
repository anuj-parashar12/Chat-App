export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading NexChat...</p>
      </div>
    </div>
  );
}
