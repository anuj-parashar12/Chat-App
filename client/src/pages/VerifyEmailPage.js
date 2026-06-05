import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="text-center">
        {status === 'loading' && <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Email verified!</h2>
            <Link to="/login" className="btn-primary inline-block mt-4">Go to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Verification failed</h2>
            <p className="text-zinc-400 text-sm">Link may be expired or invalid.</p>
            <Link to="/login" className="inline-block mt-4 text-brand-400">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
