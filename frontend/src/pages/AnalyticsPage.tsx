import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import BusinessPlaceholder from '../components/BusinessPlaceholder';
import { useBusiness } from '../context/BusinessContext';
import { invoiceApi, formatCurrency } from '../lib/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { activeBusiness } = useBusiness();

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', activeBusiness?.id],
    queryFn: () => (activeBusiness ? invoiceApi.list(activeBusiness.id) : Promise.resolve([])),
    enabled: !!activeBusiness?.id,
  });

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Select or create a business from your account to see analytics." />
    );
  }

  // Group invoices by month for sales chart
  const monthlyData = invoices.reduce((acc, inv) => {
    const date = new Date(inv.invoiceDate);
    const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    if (!acc[key]) {
      acc[key] = { month: key, sales: 0, gst: 0, count: 0 };
    }
    acc[key].sales += inv.amount - inv.gstAmount;
    acc[key].gst += inv.gstAmount;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { month: string; sales: number; gst: number; count: number }>);

  const monthlyChartData = Object.values(monthlyData).sort((a, b) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [aMonth, aYear] = a.month.split(' ');
    const [bMonth, bYear] = b.month.split(' ');
    if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
    return months.indexOf(aMonth) - months.indexOf(bMonth);
  });

  // GST breakdown (CGST, SGST, IGST)
  const gstBreakdown = invoices.reduce(
    (acc, inv) => {
      acc.cgst += inv.cgst || 0;
      acc.sgst += inv.sgst || 0;
      acc.igst += inv.igst || 0;
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );

  const gstPieData = [
    { name: 'CGST', value: gstBreakdown.cgst },
    { name: 'SGST', value: gstBreakdown.sgst },
    { name: 'IGST', value: gstBreakdown.igst },
  ].filter((d) => d.value > 0);

  // Top customers by invoice amount
  const customerTotals = invoices.reduce((acc, inv) => {
    const name = inv.customerName || 'Unknown';
    if (!acc[name]) {
      acc[name] = { name, amount: 0, count: 0 };
    }
    acc[name].amount += inv.amount;
    acc[name].count += 1;
    return acc;
  }, {} as Record<string, { name: string; amount: number; count: number }>);

  const topCustomers = Object.values(customerTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Summary stats
  const totalSales = invoices.reduce((sum, inv) => sum + (inv.amount - inv.gstAmount), 0);
  const totalGst = invoices.reduce((sum, inv) => sum + inv.gstAmount, 0);
  const totalInvoices = invoices.length;
  const avgInvoiceValue = totalInvoices > 0 ? totalSales / totalInvoices : 0;

  const hasData = invoices.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Analytics</h2>
        <p className="text-sm text-muted mt-1">
          Sales growth, GST trends, and customer insights from your invoice data.
        </p>
      </div>

      {!hasData ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-500">No invoice data yet. Create invoices or import from Excel to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted uppercase font-semibold">Total Sales</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalSales)}</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted uppercase font-semibold">Total GST</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalGst)}</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted uppercase font-semibold">Invoices</p>
              <p className="text-xl font-bold text-slate-800">{totalInvoices}</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted uppercase font-semibold">Avg Invoice</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(avgInvoiceValue)}</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Sales Chart */}
            <div className="bg-card border rounded-xl p-5">
              <p className="font-medium text-sm mb-4">Monthly Sales & GST</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gst" name="GST" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GST Breakdown Pie Chart */}
            <div className="bg-card border rounded-xl p-5">
              <p className="font-medium text-sm mb-4">GST Breakdown</p>
              <div className="h-64">
                {gstPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gstPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {gstPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted text-sm">
                    No GST data available
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {gstPieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs text-muted">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-card border rounded-xl p-5">
              <p className="font-medium text-sm mb-4">Top Customers</p>
              <div className="space-y-3">
                {topCustomers.map((customer, i) => (
                  <div key={customer.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">{customer.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(customer.amount)}</p>
                      <p className="text-xs text-muted">{customer.count} invoices</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice Trend Line */}
            <div className="bg-card border rounded-xl p-5">
              <p className="font-medium text-sm mb-4">Invoice Count Trend</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Invoices"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}