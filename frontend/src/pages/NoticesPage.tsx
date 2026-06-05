import BusinessPlaceholder from '../components/BusinessPlaceholder';
import { useBusiness } from '../context/BusinessContext';

export default function NoticesPage() {
  const { activeBusiness } = useBusiness();

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Select or create a business from your account to access notices." />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">GST Notices</h2>
        <p className="text-sm text-muted mt-1">
          Upload notice PDFs for AI-powered summary, risk assessment, and recommended actions.
        </p>
      </div>

      <label className="block bg-card border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-brand-300">
        <input type="file" accept=".pdf" className="hidden" disabled />
        <p className="font-medium">Upload GST Notice PDF</p>
        <p className="text-sm text-muted mt-2">AI Notice Interpreter — Phase 2</p>
      </label>

      <div className="bg-card border rounded-xl p-5 text-sm">
        <p className="font-medium">Example AI output (preview)</p>
        <dl className="mt-3 space-y-2 text-muted">
          <div className="flex gap-2">
            <dt className="font-medium text-slate-700 w-28">Notice Type</dt>
            <dd>Mismatch</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-slate-700 w-28">Risk</dt>
            <dd className="text-warning font-medium">Medium</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-slate-700 w-28">Action</dt>
            <dd>Respond within 15 days</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
