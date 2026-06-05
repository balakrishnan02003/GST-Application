import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, businessApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('0');
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }

    if (!businessName.trim() || !gstin.trim()) {
      setError('Business name and GSTIN are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        name,
        email,
        password,
        role: Number(role),
      });
      login(res.accessToken, res.refreshToken, res.user);

      // create business
      try {
        const created = await businessApi.create({ name: businessName, gstin });
        const businessId = (created as any).id || (created as any).Id;
        if (businessId) {
          localStorage.setItem('activeBusinessId', businessId);
        }
        await queryClient.invalidateQueries({ queryKey: ['businesses'] });
      } catch (bErr) {
        // if business creation fails, surface the backend message when possible
        if (bErr instanceof AxiosError && bErr.response?.data) {
          const msg = (bErr.response.data as any).message;
          setError(msg || 'Business creation failed after registration.');
        } else {
          setError('Business creation failed after registration.');
        }
        setLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.data) {
          const message = (error.response.data as any).message;
          setError(message || 'Registration failed. Email may already be in use or data is invalid.');
        } else if (error.request) {
          setError('Could not connect to the backend server. Please make sure the API is running at http://localhost:5253');
        } else {
          setError(error.message || 'Registration failed.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-surface">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-lg border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-brand-900">Create your account</h2>
        <p className="text-muted mt-1 mb-6">Start managing GST compliance in minutes</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
              >
                <option value="0">Business Owner</option>
                <option value="1">Accountant</option>
                <option value="2">CA Firm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
                placeholder="ABC Company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GSTIN</label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
                placeholder="29ABCDE1234F1Z5"
              />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg"
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-muted mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
