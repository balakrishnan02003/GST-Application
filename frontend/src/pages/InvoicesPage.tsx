import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useBusiness } from '../context/BusinessContext';
import { formatCurrency, invoiceApi } from '../lib/api';
import BusinessPlaceholder from '../components/BusinessPlaceholder';
import InvoiceImportWizard from '../components/InvoiceImportWizard';
import CreateInvoiceModal from '../components/CreateInvoiceModal';

export default function InvoicesPage() {
  const { activeBusiness } = useBusiness();
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string; invoiceNo: string; status: string } | null>(null);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', activeBusiness?.id],
    queryFn: () => invoiceApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (invoiceId: string) => invoiceApi.delete(activeBusiness!.id, invoiceId),
    onSuccess: () => {
      refetch();
      setInvoiceToDelete(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Failed to delete invoice');
    },
  });

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Select or create a business from your account to manage invoices." />
    );
  }

  if (showImport) {
    return (
      <InvoiceImportWizard
        onClose={() => setShowImport(false)}
        onImportSuccess={() => {
          refetch();
          setShowImport(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold">Invoice Management</h2>
          <p className="text-sm text-muted mt-1">Create, send, and track GST invoices</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImport(true)}
            className="bg-brand-50 hover:bg-brand-100 text-brand-700 px-4 py-2 border border-brand-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Import Excel/CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-muted">
        <span className="px-2 py-1 bg-slate-100 rounded font-medium">Excel/CSV Import Ready</span>
        <span className="px-2 py-1 bg-slate-100 rounded">PDF download — coming soon</span>
        <span className="px-2 py-1 bg-slate-100 rounded">Email / WhatsApp — coming soon</span>
      </div>

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            refetch();
            setShowCreate(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Delete Invoice</h3>
              {invoiceToDelete.status === 'Draft' ? (
                <p className="text-sm text-muted mt-1">
                  Are you sure you want to delete invoice <strong>{invoiceToDelete.invoiceNo}</strong>? This action cannot be undone.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <strong>Warning:</strong> This invoice has been marked as <strong>Issued</strong>. It may have been filed with the GST portal.
                  </p>
                  <p className="text-sm text-muted">
                    Are you sure you want to delete invoice <strong>{invoiceToDelete.invoiceNo}</strong>? This action cannot be undone.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(invoiceToDelete.id)}
                disabled={deleteMutation.isPending}
                className={`px-4 py-2 text-white disabled:opacity-50 rounded-lg text-sm font-bold transition ${
                  invoiceToDelete.status === 'Draft' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {deleteMutation.isPending ? 'Deleting...' : invoiceToDelete.status === 'Draft' ? 'Delete' : 'Delete Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center text-muted">
          No invoices yet. Create your first invoice or import from Excel/CSV to get started.
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">GST</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.invoiceNo}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-slate-700">{inv.customerName ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(inv.gstAmount)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setInvoiceToDelete({ id: inv.id, invoiceNo: inv.invoiceNo, status: inv.status })}
                      className={`p-1.5 rounded-lg transition-colors ${
                        inv.status === 'Draft'
                          ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                          : 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                      title={inv.status === 'Draft' ? 'Delete invoice' : 'Delete issued invoice'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

