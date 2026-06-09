import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useBusiness } from '../context/BusinessContext';
import { uploadApi, formatCurrency } from '../lib/api';
import BusinessPlaceholder from '../components/BusinessPlaceholder';

interface UploadResult {
  taxableSales?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  itc?: number;
  netLiability?: number;
  shortSummary?: string;
  format?: string;
  rowCount?: number;
}

const fileTypes = [
  { id: 'gstr1', label: 'GSTR-1', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.gstr1, formats: 'JSON, Excel, CSV' },
  { id: 'gstr2b', label: 'GSTR-2B', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.gstr2b, formats: 'JSON, Excel, CSV' },
  { id: 'gstr3b', label: 'GSTR-3B', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.gstr3b, formats: 'JSON, Excel, CSV' },
  { id: 'ledger', label: 'GST Ledger', accept: '.json,.xlsx,.xls,.csv', handler: uploadApi.ledger, formats: 'JSON, Excel, CSV' },
];

export default function UploadsPage() {
  const { activeBusiness } = useBusiness();
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadType, setUploadType] = useState<string>('');
  const [message, setMessage] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      if (!activeBusiness) throw new Error('No business selected');
      const config = fileTypes.find((f) => f.id === type);
      if (!config?.handler) throw new Error(`No handler for ${type}`);
      return config.handler(activeBusiness.id, file);
    },
    onSuccess: (data: UploadResult) => {
      setResult(data);
      setMessage('File uploaded successfully.');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(error.response?.data?.message || error.message || 'Upload failed. Check file format.');
      setResult(null);
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
                if (file) {
                  setUploadType(ft.id);
                  uploadMutation.mutate({ file, type: ft.id });
                }
                e.target.value = '';
              }}
            />
          </label>
        ))}
      </div>

      {uploadMutation.isPending && <p className="text-sm text-brand-600">Uploading...</p>}
      
      {/* Success Message */}
      {message && !result && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          {message}
        </div>
      )}

      {/* Upload Summary Card */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">
                {uploadType === 'gstr1' && 'GSTR-1 Uploaded'}
                {uploadType === 'gstr2b' && 'GSTR-2B Uploaded'}
                {uploadType === 'gstr3b' && 'GSTR-3B Uploaded'}
                {uploadType === 'ledger' && 'GST Ledger Uploaded'}
              </h3>
              <p className="text-xs text-emerald-700">{result.shortSummary || result.format}</p>
            </div>
          </div>

          {/* GST Summary Data */}
          {(result.taxableSales !== undefined || result.itc !== undefined) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-emerald-200">
              {result.taxableSales !== undefined && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Taxable Sales</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(result.taxableSales)}</p>
                </div>
              )}
              {(result.cgst !== undefined || result.sgst !== undefined || result.igst !== undefined) && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Output Tax</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {formatCurrency((result.cgst || 0) + (result.sgst || 0) + (result.igst || 0))}
                  </p>
                </div>
              )}
              {result.itc !== undefined && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">ITC Available</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(result.itc)}</p>
                </div>
              )}
              {result.netLiability !== undefined && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Net Liability</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(result.netLiability)}</p>
                </div>
              )}
            </div>
          )}

          {/* Generic file info */}
          {result.rowCount !== undefined && (
            <div className="text-xs text-emerald-700 pt-2">
              <span className="font-medium">{result.rowCount.toLocaleString()}</span> rows parsed
            </div>
          )}
        </div>
      )}
    </div>
  );
}
