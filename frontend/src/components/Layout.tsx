import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../lib/api';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/uploads', label: 'GST Uploads' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/itc', label: 'ITC Tracker' },
  { to: '/notices', label: 'Notices' },
  { to: '/analytics', label: 'Analytics' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { businesses, activeBusiness, setActiveBusinessId } = useBusiness();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddBusinessModal, setShowAddBusinessModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessGstin, setNewBusinessGstin] = useState('');
  const [businessError, setBusinessError] = useState('');

  const createBusinessMutation = useMutation({
    mutationFn: (data: { name: string; gstin: string }) => businessApi.create(data),
    onSuccess: (created) => {
      const businessId = (created as any).id || (created as any).Id;
      if (businessId) {
        setActiveBusinessId(businessId);
      }
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setShowAddBusinessModal(false);
      setNewBusinessName('');
      setNewBusinessGstin('');
      setBusinessError('');
    },
    onError: (err) => {
      if (err instanceof AxiosError && err.response?.data) {
        const msg = (err.response.data as any).message;
        setBusinessError(msg || 'Failed to create business.');
      } else {
        setBusinessError('Failed to create business.');
      }
    },
  });

  const handleCreateBusiness = () => {
    if (!newBusinessName.trim() || !newBusinessGstin.trim()) {
      setBusinessError('Business name and GSTIN are required.');
      return;
    }
    createBusinessMutation.mutate({
      name: newBusinessName.trim(),
      gstin: newBusinessGstin.trim().toUpperCase(),
    });
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight">GST Platform</h1>
          <p className="text-xs text-white/60 mt-1">Compliance & Intelligence</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-white/70 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/50 mb-1">Signed in as</p>
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="mt-3 text-xs text-white/60 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">{activeBusiness?.name ?? 'Your Business'}</h2>
            {activeBusiness && (
              <p className="text-sm text-muted">GSTIN: {activeBusiness.gstin}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {businesses.length > 0 && (
              <select
                value={activeBusiness?.id ?? ''}
                onChange={(e) => setActiveBusinessId(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowAddBusinessModal(true)}
              className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              title="Add new business"
            >
              + Add Business
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl border text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Sign Out</h3>
              <p className="text-sm text-muted mt-1">Are you sure you want to sign out?</p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="px-4 py-2 border text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSignOutModal(false);
                  logout();
                  navigate('/login');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Business Modal */}
      {showAddBusinessModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Add New Business</h3>
              <p className="text-xs text-muted">Register a new business to manage its GST compliance.</p>
            </div>
            {businessError && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                {businessError}
              </div>
            )}
            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-700">Business Name *</label>
                <input
                  type="text"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="e.g. ABC Enterprises Pvt Ltd"
                  className="text-sm border rounded-lg p-2 bg-card border-slate-200 focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-700">GSTIN *</label>
                <input
                  type="text"
                  value={newBusinessGstin}
                  onChange={(e) => setNewBusinessGstin(e.target.value)}
                  placeholder="15-digit GST number (e.g., 29ABCDE1234F1Z5)"
                  className="text-sm border rounded-lg p-2 bg-card border-slate-200 focus:border-brand-500 outline-none uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setShowAddBusinessModal(false);
                  setBusinessError('');
                  setNewBusinessName('');
                  setNewBusinessGstin('');
                }}
                className="px-4 py-2 border text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBusiness}
                disabled={createBusinessMutation.isPending}
                className="px-4 py-2 bg-brand-600 text-white disabled:opacity-50 text-sm font-bold rounded-lg hover:bg-brand-700"
              >
                {createBusinessMutation.isPending ? 'Creating...' : 'Create Business'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
