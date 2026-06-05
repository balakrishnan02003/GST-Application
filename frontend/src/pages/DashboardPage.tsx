import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/StatCard';
import BusinessPlaceholder from '../components/BusinessPlaceholder';
import { useBusiness } from '../context/BusinessContext';
import { dashboardApi, formatCurrency } from '../lib/api';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { activeBusiness, businesses, isLoading: businessesLoading } = useBusiness();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeBusiness?.id],
    queryFn: () => dashboardApi.summary(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  if (businessesLoading) {
    return <p className="text-muted">Loading...</p>;
  }

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Create or select a business from your account to see your GST dashboard." />
    );
  }

  if (isLoading || !data) {
    return <p className="text-muted">Loading dashboard...</p>;
  }

  const hasData = data.gstPayable > 0 || data.sales > 0 || data.availableItc > 0;

  return (
    <div className="space-y-6">
      {!hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Welcome to your GST Dashboard</h3>
          <p className="text-sm text-blue-800 mb-4">
            Your dashboard is empty. Get started by creating invoices or uploading your GST returns.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/invoices"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create Invoice
            </Link>
            <Link
              to="/uploads"
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
            >
              Upload GSTR-1
            </Link>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">GST Overview</h2>
          <p className="text-sm text-muted">Current period summary</p>
        </div>
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-muted font-medium">GST Health Score</p>
            <p className="text-2xl font-bold text-brand-700">{data.healthScore}/100</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-brand-500 flex items-center justify-center text-sm font-bold text-brand-700">
            {data.healthScore >= 80 ? 'Good' : data.healthScore >= 60 ? 'Fair' : 'Risk'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="GST Payable" value={formatCurrency(data.gstPayable)} />
        <StatCard
          label="Available ITC"
          value={formatCurrency(data.availableItc)}
          variant="success"
        />
        <StatCard
          label="Net Liability"
          value={formatCurrency(data.netLiability)}
          subtext="Output GST − Eligible ITC"
          variant="warning"
        />
        <StatCard label="Taxable Sales" value={formatCurrency(data.sales)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Upcoming Due Dates</h3>
          {data.upcomingDueDates.length === 0 ? (
            <p className="text-sm text-muted">No upcoming filings.</p>
          ) : (
            <ul className="space-y-3">
              {data.upcomingDueDates.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted">{item.filingType}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      item.daysRemaining <= 5
                        ? 'bg-red-100 text-danger'
                        : 'bg-amber-100 text-warning'
                    }`}
                  >
                    {item.daysRemaining} days left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Alerts</h3>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-muted">No active alerts. You're on track.</p>
          ) : (
            <ul className="space-y-3">
              {data.alerts.map((alert, i) => (
                <li
                  key={i}
                  className={`p-3 rounded-lg text-sm ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  <span className="font-medium">{alert.type}: </span>
                  {alert.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {businesses.length > 0 && (
        <p className="text-xs text-muted">
          Purchases this period: {formatCurrency(data.purchases)} ·{' '}
          <Link to="/itc" className="text-brand-600 hover:underline">
            Review ITC mismatches →
          </Link>
        </p>
      )}
    </div>
  );
}
