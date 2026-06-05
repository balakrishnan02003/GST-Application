import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '../context/BusinessContext';
import { formatCurrency, itcApi } from '../lib/api';
import BusinessPlaceholder from '../components/BusinessPlaceholder';

export default function ItcPage() {
  const { activeBusiness } = useBusiness();

  const { data: mismatches = [], isLoading } = useQuery({
    queryKey: ['itc', activeBusiness?.id],
    queryFn: () => itcApi.mismatches(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Select or create a business from your account to review ITC mismatches." />
    );
  }
  if (isLoading) return <p className="text-muted">Loading ITC analysis...</p>;

  const totalLoss = mismatches.reduce((sum, m) => sum + m.potentialLoss, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">ITC Tracker</h2>
        <p className="text-sm text-muted mt-1">
          Compare purchase invoices vs GSTR-2B to find missing credits and vendor issues.
        </p>
      </div>

      {mismatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-900">Potential ITC Loss</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{formatCurrency(totalLoss)}</p>
        </div>
      )}

      {mismatches.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center text-muted">
          No ITC mismatches detected. Upload GSTR-2B to refresh analysis.
        </div>
      ) : (
        <div className="space-y-4">
          {mismatches.map((m) => (
            <div key={m.id} className="bg-card border rounded-xl p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{m.vendorName}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {m.vendorGstin} · Invoice {m.invoiceNo}
                  </p>
                </div>
                <p className="text-lg font-bold text-danger">
                  {formatCurrency(m.potentialLoss)}
                </p>
              </div>
              <p className="text-sm mt-3 text-slate-700">{m.issue}</p>
              <div className="flex gap-6 mt-3 text-xs text-muted">
                <span>Expected ITC: {formatCurrency(m.expectedItc)}</span>
                <span>Reported ITC: {formatCurrency(m.reportedItc)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
