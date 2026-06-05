import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useBusiness } from '../context/BusinessContext';
import { uploadApi } from '../lib/api';
import BusinessPlaceholder from '../components/BusinessPlaceholder';

const fileTypes = [
  { id: 'gstr1', label: 'GSTR-1', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.gstr1, formats: 'JSON, Excel, CSV' },
  { id: 'gstr2b', label: 'GSTR-2B', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.gstr2b, formats: 'JSON, Excel, CSV' },
  { id: 'gstr3b', label: 'GSTR-3B', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.gstr3b, formats: 'JSON, Excel, CSV' },
  { id: 'ledger', label: 'GST Ledger', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.ledger, formats: 'JSON, Excel, CSV' },
];

export default function UploadsPage() {
  const { activeBusiness } = useBusiness();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      if (!activeBusiness) throw new Error('No business selected');
      const config = fileTypes.find((f) => f.id === type);
      if (!config?.handler) throw new Error(`No handler for ${type}`);
      return config.handler(activeBusiness.id, file);
    },
    onSuccess: (data) => {
      setResult(data as Record<string, unknown>);
      setMessage('File parsed successfully.');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(error.response?.data?.message || error.message || 'Upload failed. Check file format.');
    },
  });

  if (!activeBusiness) {
    return (
      <BusinessPlaceholder description="Select or create a business from your account to upload GST returns and ledgers." />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold">Upload GST Files</h2>
        <p className="text-sm text-muted mt-1">
          Upload returns and ledgers — we parse and update your dashboard automatically.
        </p>
      </div>

      <div className="grid gap-4">
        {fileTypes.map((ft) => (
          <label
            key={ft.id}
            className="flex items-center justify-between bg-card border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-brand-300 transition-colors"
          >
            <div>
              <p className="font-medium">{ft.label}</p>
              <p className="text-xs text-muted mt-0.5">Supported: {ft.formats}</p>
            </div>
            <input
              type="file"
              accept={ft.accept}
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate({ file, type: ft.id });
                e.target.value = '';
              }}
            />
          </label>
        ))}
      </div>

      {uploadMutation.isPending && <p className="text-sm text-brand-600">Parsing...</p>}
      {message && <p className="text-sm text-muted">{message}</p>}
      {result && (
        <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
