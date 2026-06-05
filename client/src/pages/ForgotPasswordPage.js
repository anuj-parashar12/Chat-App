import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface-900 rounded-2xl p-6 border border-surface-800">
          <h1 className="text-xl font-semibold text-white mb-1">Reset password</h1>
          <p className="text-zinc-500 text-sm mb-6">Enter your email to receive a reset link</p>
          {sent ? (
            <p className="text-green-400 text-sm">Check your inbox for a password reset link.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-field" />
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending...' : 'Send reset link'}</button>
            </form>
          )}
        </div>
        <p className="text-center text-zinc-500 text-sm mt-4">
          <Link to="/login" className="text-brand-400 hover:text-brand-300">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
