interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variants = {
  default: 'border-slate-200',
  success: 'border-emerald-200 bg-emerald-50/50',
  warning: 'border-amber-200 bg-amber-50/50',
  danger: 'border-red-200 bg-red-50/50',
};

export default function StatCard({ label, value, subtext, variant = 'default' }: StatCardProps) {
  return (
    <div className={`bg-card rounded-xl border p-5 shadow-sm ${variants[variant]}`}>
      <p className="text-sm text-muted font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1 text-brand-900">{value}</p>
      {subtext && <p className="text-xs text-muted mt-2">{subtext}</p>}
    </div>
  );
}
