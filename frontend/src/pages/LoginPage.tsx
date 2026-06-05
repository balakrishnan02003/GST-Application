import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      login(res.accessToken, res.refreshToken, res.user);
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.data) {
          const message = (error.response.data as any).message;
          setError(message || 'Invalid email or password.');
        } else if (error.request) {
          setError('Could not connect to the backend server. Please make sure the API is running at http://localhost:5253');
        } else {
          setError(error.message || 'Login failed.');
        }
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold">GST Platform</h1>
          <p className="text-white/70 mt-2 max-w-md">
            Manage compliance, taxes, invoices, and financial health — without depending on
            accountants for every small task.
          </p>
        </div>
        <div className="space-y-4 text-sm text-white/80">
          <p>✓ GST dashboard & liability insights</p>
          <p>✓ ITC tracking & vendor compliance</p>
          <p>✓ Invoice generation & compliance alerts</p>
          <p>✓ GST health score for your business</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-brand-900">Welcome back</h2>
          <p className="text-muted mt-1 mb-8">Sign in to your compliance dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="you@business.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            New here?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Create account
            </Link>
          </p>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-muted">
            <p className="font-medium text-slate-700 mb-1">Coming soon</p>
            <p>Google login · OTP login</p>
          </div>
        </div>
      </div>
    </div>
  );
}
