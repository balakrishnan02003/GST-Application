import BusinessPlaceholder from '../components/BusinessPlaceholder';
import { useBusiness } from '../context/BusinessContext';

export default function AnalyticsPage() {
  const { activeBusiness } = useBusiness();

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Select or create a business from your account to see analytics." />
    );
  }

  const placeholders = [
    { label: 'Monthly Sales', height: 'h-32' },
    { label: 'GST Trends', height: 'h-32' },
    { label: 'Top Customers', height: 'h-24' },
    { label: 'Top Products', height: 'h-24' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Analytics</h2>
        <p className="text-sm text-muted mt-1">
          Sales growth, GST trends, ITC trends, and customer insights — Growth plan feature.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {placeholders.map((p) => (
          <div key={p.label} className="bg-card border rounded-xl p-5">
            <p className="font-medium text-sm mb-4">{p.label}</p>
            <div
              className={`${p.height} bg-linear-to-t from-brand-100 to-brand-50 rounded-lg flex items-end justify-center pb-4`}
            >
              <span className="text-xs text-muted">Charts — Phase 2</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
