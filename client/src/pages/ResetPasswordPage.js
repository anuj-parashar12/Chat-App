import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success('Password reset! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-900 rounded-2xl p-6 border border-surface-800">
        <h1 className="text-xl font-semibold text-white mb-1">Set new password</h1>
        <p className="text-zinc-500 text-sm mb-6">Choose a strong password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8 chars)" className="input-field" />
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Resetting...' : 'Reset password'}</button>
        </form>
      </div>
    </div>
  );
}
