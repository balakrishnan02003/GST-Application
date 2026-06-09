import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useBusiness } from '../context/BusinessContext';
import { customerApi, invoiceApi, formatCurrency } from '../lib/api';
import type { BulkImportInvoice } from '../types';

interface WizardProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

interface Mapping {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  taxableValue: string;
  gstRate: string;
  cgst: string;
  sgst: string;
  igst: string;
  amount: string;
  description: string;
}

interface ParsedInvoiceRow {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
  description: string;
  errors: string[];
}

export default function InvoiceImportWizard({ onClose, onImportSuccess }: WizardProps) {
  const { activeBusiness } = useBusiness();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Partial<Mapping>>({});
  const [parsedRows, setParsedRows] = useState<ParsedInvoiceRow[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerGstin, setNewCustomerGstin] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch customers for resolution
  const { data: customers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ['customers', activeBusiness?.id],
    queryFn: () => customerApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; gstin?: string }) =>
      customerApi.create(activeBusiness!.id, data),
    onSuccess: () => {
      refetchCustomers();
      setShowAddCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerGstin('');
    },
    onError: () => {
      alert('Failed to create customer. Please verify details.');
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: BulkImportInvoice[]) => invoiceApi.bulkImport(activeBusiness!.id, data),
    onSuccess: (res) => {
      setSuccessMessage(res?.message || 'Invoices imported successfully!');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(error.response?.data?.message || 'Failed to import invoices.');
    },
  });

  // Target Invoice Schema Fields
  const schemaFields = [
    { key: 'invoiceNo', label: 'Invoice Number *', required: true, placeholder: 'e.g. Invoice No, Bill No' },
    { key: 'invoiceDate', label: 'Invoice Date *', required: true, placeholder: 'e.g. Date, Invoice Date' },
    { key: 'customerName', label: 'Customer Name *', required: true, placeholder: 'e.g. Customer Name, Party Name' },
    { key: 'customerGstin', label: 'Customer GSTIN', required: false, placeholder: 'e.g. GSTIN, Customer GST' },
    { key: 'taxableValue', label: 'Taxable Value *', required: true, placeholder: 'e.g. Taxable Value, Subtotal' },
    { key: 'gstRate', label: 'GST Rate (%)', required: false, placeholder: 'e.g. GST Rate, Tax %' },
    { key: 'cgst', label: 'CGST Amount', required: false, placeholder: 'e.g. CGST' },
    { key: 'sgst', label: 'SGST Amount', required: false, placeholder: 'e.g. SGST' },
    { key: 'igst', label: 'IGST Amount', required: false, placeholder: 'e.g. IGST' },
    { key: 'amount', label: 'Total Amount', required: false, placeholder: 'e.g. Total, Invoice Value' },
    { key: 'description', label: 'Item Description', required: false, placeholder: 'e.g. Description, Item Details' },
  ];

  // Helper to run auto mapping when file headers are parsed
  const getAutoMapping = (fileHeaders: string[]): Partial<Mapping> => {
    const initialMap: Partial<Mapping> = {};
    fileHeaders.forEach((h) => {
      const lower = h.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (lower.includes('date')) {
        if (!initialMap.invoiceDate) initialMap.invoiceDate = h;
      } else if (
        lower.includes('inv') ||
        lower.includes('bill') ||
        lower.includes('doc') ||
        lower.includes('voucher') ||
        lower === 'no' ||
        lower === 'number'
      ) {
        if (!initialMap.invoiceNo) initialMap.invoiceNo = h;
      } else if (lower.includes('gstin') || lower === 'gst' || lower.includes('tin')) {
        if (!initialMap.customerGstin) initialMap.customerGstin = h;
      } else if (
        lower.includes('cust') ||
        lower.includes('client') ||
        lower.includes('party') ||
        lower.includes('buyer') ||
        lower.includes('name')
      ) {
        // Priority to customerName over invoice number/date mapping if it has customer keywords
        if (lower.includes('cust') || lower.includes('party') || lower.includes('client')) {
          initialMap.customerName = h;
        } else if (!initialMap.customerName && !lower.includes('date') && !lower.includes('no')) {
          initialMap.customerName = h;
        }
      } else if (
        lower.includes('taxable') ||
        lower.includes('subtotal') ||
        lower.includes('net') ||
        lower === 'value' ||
        lower === 'assessable'
      ) {
        if (!initialMap.taxableValue) initialMap.taxableValue = h;
      } else if (lower.includes('rate') || lower.includes('pct') || lower.includes('percent')) {
        if (!initialMap.gstRate) initialMap.gstRate = h;
      } else if (lower === 'cgst' || lower.includes('cgstamount')) {
        if (!initialMap.cgst) initialMap.cgst = h;
      } else if (lower === 'sgst' || lower === 'utgst' || lower.includes('sgstamount')) {
        if (!initialMap.sgst) initialMap.sgst = h;
      } else if (lower === 'igst' || lower.includes('igstamount')) {
        if (!initialMap.igst) initialMap.igst = h;
      } else if (
        lower === 'total' ||
        lower.includes('gross') ||
        lower === 'amount' ||
        lower === 'invval'
      ) {
        if (!initialMap.amount) initialMap.amount = h;
      } else if (lower.includes('desc') || lower.includes('particular') || lower.includes('item')) {
        if (!initialMap.description) initialMap.description = h;
      }
    });
    return initialMap;
  };

  // Perform validation on a row
  const validateRow = (row: Omit<ParsedInvoiceRow, 'errors'> & { errors?: string[] }): ParsedInvoiceRow => {
    const errors: string[] = [];

    if (!row.invoiceNo) {
      errors.push('Invoice number is required');
    }
    if (!row.invoiceDate || isNaN(new Date(row.invoiceDate).getTime())) {
      errors.push('Valid invoice date is required (YYYY-MM-DD)');
    }
    if (!row.customerName) {
      errors.push('Customer Name is required');
    }
    if (row.taxableValue <= 0) {
      errors.push('Taxable value must be greater than 0');
    }

    // Verify amount sum check
    const calculatedSum = row.taxableValue + row.cgst + row.sgst + row.igst;
    if (Math.abs(calculatedSum - row.amount) > 2) {
      errors.push(`Total Amount (${row.amount}) does not match Taxable Value + GST sum (${calculatedSum.toFixed(2)})`);
    }

    // Verify GSTIN formatting if provided
    if (row.customerGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(row.customerGstin)) {
      errors.push('Invalid GSTIN format');
    }

    return { ...row, errors };
  };

  // Convert raw sheet data into target schema rows
  const processMappedData = (
    customMapping?: Partial<Mapping>,
    customHeaders?: string[],
    customSheetData?: any[][]
  ) => {
    const activeMapping = customMapping || mapping;
    const activeHeaders = customHeaders || headers;
    const activeSheetData = customSheetData || sheetData;

    const rows = activeSheetData.map((rawRow, index) => {
      const getVal = (field: keyof Mapping): any => {
        const mappedHeader = activeMapping[field]?.toString().toLowerCase().trim();
        if (!mappedHeader) return undefined;
        const hIdx = activeHeaders.findIndex(
          (h) => h?.toString().toLowerCase().trim() === mappedHeader
        );
        return hIdx !== -1 ? rawRow[hIdx] : undefined;
      };

      // Extract invoice no
      const invoiceNo = getVal('invoiceNo')?.toString().trim() || '';

      // Parse date (Handles Excel serials and string dates)
      let rawDate = getVal('invoiceDate');
      let parsedDate = '';
      if (typeof rawDate === 'number') {
        const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
        parsedDate = dateObj.toISOString().split('T')[0];
      } else if (rawDate) {
        const dObj = new Date(rawDate);
        if (!isNaN(dObj.getTime())) {
          parsedDate = dObj.toISOString().split('T')[0];
        } else {
          parsedDate = rawDate.toString(); // preserve string if invalid for manual correction
        }
      }

      const customerName = getVal('customerName')?.toString().trim() || '';
      const customerGstin = getVal('customerGstin')?.toString().trim().toUpperCase() || '';
      const taxableValue = parseFloat(getVal('taxableValue')) || 0;
      const gstRate = parseFloat(getVal('gstRate')) || 0;
      let cgst = parseFloat(getVal('cgst')) || 0;
      let sgst = parseFloat(getVal('sgst')) || 0;
      let igst = parseFloat(getVal('igst')) || 0;
      let amount = parseFloat(getVal('amount')) || 0;
      const description = getVal('description')?.toString().trim() || '';

      // Hybrid calculation logic
      if (cgst === 0 && sgst === 0 && igst === 0 && gstRate > 0 && taxableValue > 0) {
        const totalTax = (taxableValue * gstRate) / 100;
        const bState = activeBusiness?.gstin.substring(0, 2);
        const cState = customerGstin ? customerGstin.substring(0, 2) : bState;

        if (cState && bState && cState !== bState) {
          igst = totalTax;
        } else {
          cgst = totalTax / 2;
          sgst = totalTax / 2;
        }
      }

      if (amount === 0) {
        amount = taxableValue + cgst + sgst + igst;
      }

      return {
        id: `row-${index}`,
        invoiceNo,
        invoiceDate: parsedDate,
        customerName,
        customerGstin,
        taxableValue,
        gstRate,
        cgst,
        sgst,
        igst,
        amount,
        description,
        errors: [] as string[],
      };
    });

    const validatedRows = rows.map((r) => validateRow(r));
    setParsedRows(validatedRows);
    setStep(3);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Read raw grid (arrays) to preserve header structure and indices
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (json.length === 0) {
          alert('Spreadsheet is empty.');
          return;
        }

        // Find header row (usually index 0, but sometimes sheets have empty spacer rows at start)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(json.length, 10); i++) {
          if (json[i] && json[i].length > 1) {
            headerRowIndex = i;
            break;
          }
        }

        const rawHeaders = json[headerRowIndex].map((h: any) => h?.toString() || '');
        const rawData = json.slice(headerRowIndex + 1).filter((row) => row.length > 0);

        const initialMap = getAutoMapping(rawHeaders);
        setHeaders(rawHeaders);
        setSheetData(rawData);
        setMapping(initialMap);

        // Check if all required fields are mapped
        const requiredFields = ['invoiceNo', 'invoiceDate', 'customerName', 'taxableValue'];
        const allRequiredMapped = requiredFields.every((key) => !!initialMap[key as keyof Mapping]);

        if (allRequiredMapped) {
          processMappedData(initialMap, rawHeaders, rawData);
        } else {
          setStep(2);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse Excel/CSV. Ensure the file format is valid.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Handle cell edit in step 3 review grid
  const handleCellEdit = (rowId: string, field: keyof Omit<ParsedInvoiceRow, 'id' | 'errors'>, value: any) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        let updatedValue = value;
        if (['taxableValue', 'gstRate', 'cgst', 'sgst', 'igst', 'amount'].includes(field)) {
          updatedValue = parseFloat(value) || 0;
        }

        const newRow = { ...row, [field]: updatedValue };

        // Auto-recalculate CGST, SGST, IGST and total amount if taxable value or rate changes
        if (field === 'taxableValue' || field === 'gstRate') {
          const totalTax = (newRow.taxableValue * newRow.gstRate) / 100;
          const bState = activeBusiness?.gstin.substring(0, 2);
          const cState = newRow.customerGstin ? newRow.customerGstin.substring(0, 2) : bState;

          if (cState && bState && cState !== bState) {
            newRow.igst = totalTax;
            newRow.cgst = 0;
            newRow.sgst = 0;
          } else {
            newRow.cgst = totalTax / 2;
            newRow.sgst = totalTax / 2;
            newRow.igst = 0;
          }
          newRow.amount = newRow.taxableValue + newRow.cgst + newRow.sgst + newRow.igst;
        }

        return validateRow(newRow);
      })
    );
  };

  const handleAddNewRow = () => {
    const newRow: ParsedInvoiceRow = {
      id: `manual-${Date.now()}`,
      invoiceNo: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      customerName: '',
      customerGstin: '',
      taxableValue: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      amount: 0,
      description: '',
      errors: ['Invoice number is required', 'Customer Name is required', 'Taxable value must be greater than 0'],
    };
    setParsedRows((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAutoCalcAll = () => {
    setParsedRows((prev) =>
      prev.map((row) => {
        const totalTax = (row.taxableValue * row.gstRate) / 100;
        const bState = activeBusiness?.gstin.substring(0, 2);
        const cState = row.customerGstin ? row.customerGstin.substring(0, 2) : bState;
        
        let cgst = 0, sgst = 0, igst = 0;
        if (cState && bState && cState !== bState) {
          igst = totalTax;
        } else {
          cgst = totalTax / 2;
          sgst = totalTax / 2;
        }
        
        return validateRow({
          ...row,
          cgst,
          sgst,
          igst,
          amount: row.taxableValue + cgst + sgst + igst,
        });
      })
    );
  };

  const handleCommitImport = () => {
    // Prevent import if there are rows with blocking errors
    const errorCount = parsedRows.reduce((sum, r) => sum + r.errors.length, 0);
    if (errorCount > 0) {
      alert('Please fix all errors in the review grid before importing.');
      return;
    }

    const payload: BulkImportInvoice[] = parsedRows.map((r) => ({
      invoiceNo: r.invoiceNo,
      invoiceDate: r.invoiceDate,
      customerName: r.customerName,
      customerGstin: r.customerGstin || undefined,
      taxableValue: r.taxableValue,
      gstRate: r.gstRate,
      cgst: r.cgst,
      sgst: r.sgst,
      igst: r.igst,
      amount: r.amount,
      description: r.description || undefined,
    }));

    importMutation.mutate(payload);
  };

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) return;
    createCustomerMutation.mutate({
      name: newCustomerName.trim(),
      gstin: newCustomerGstin.trim() || undefined,
    });
  };

  // Check if a customer matches existing database
  const getCustomerStatus = (name: string, gstin?: string) => {
    if (!name) return { status: 'empty', label: '—' };
    
    let matched = null;
    if (gstin) {
      matched = customers.find((c) => c.gstin?.toUpperCase() === gstin.toUpperCase());
    }
    if (!matched) {
      matched = customers.find((c) => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    }

    if (matched) {
      return { status: 'matched', label: 'Matched', customer: matched };
    }
    return { status: 'new', label: 'New customer (will create)' };
  };

  const filteredRows = parsedRows;

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header and Step Indicators */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Import Invoices from Excel/CSV</h2>
          <p className="text-sm text-muted">Upload sales registers, purchase bills or custom billing spreadsheets.</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-lg text-sm font-semibold"
        >
          Cancel
        </button>
      </div>

      {/* Progress Wizard bar */}
      <div className="flex items-center justify-center space-x-4 max-w-lg mx-auto py-2">
        <div className="flex items-center space-x-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            1
          </div>
          <span className={`text-xs font-medium ${step >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Upload File</span>
        </div>
        <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-brand-600' : 'bg-slate-100'}`} />
        <div className="flex items-center space-x-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            2
          </div>
          <span className={`text-xs font-medium ${step >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Map Columns</span>
        </div>
        <div className={`h-0.5 w-16 ${step >= 3 ? 'bg-brand-600' : 'bg-slate-100'}`} />
        <div className="flex items-center space-x-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 3 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            3
          </div>
          <span className={`text-xs font-medium ${step >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Review & Edit</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="space-y-4 max-w-xl mx-auto py-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-brand-500 cursor-pointer rounded-2xl p-12 text-center transition-all bg-slate-50/50 hover:bg-slate-50"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</p>
            <p className="text-xs text-muted mt-1">Excel (.xlsx, .xls) or CSV (.csv) format</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <div className="bg-slate-50 rounded-xl p-4 text-xs text-muted border">
            <p className="font-semibold text-slate-700 mb-1">💡 Import Tips:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Spreadsheet can have arbitrary column order or structures; you map them in the next step.</li>
              <li>Multiple items under the same Invoice Number will automatically merge into a single invoice.</li>
              <li>Numeric values are automatically normalized. Invalid dates will be highlighted for editing.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-xs text-brand-800">
            <p className="font-medium text-brand-900">Map Columns</p>
            <p className="mt-0.5">We found <strong>{headers.length} headers</strong> in your sheet. Map them to the system's Invoice fields below.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {schemaFields.map((field) => {
              const matchedHeader = mapping[field.key as keyof Mapping];
              return (
                <div key={field.key} className="flex flex-col space-y-1 border p-3 rounded-xl bg-slate-50/50">
                  <label className="text-xs font-semibold text-slate-700 flex justify-between">
                    <span>{field.label}</span>
                    {field.required && <span className="text-red-500 text-[10px] font-medium">Required</span>}
                  </label>
                  <input
                    type="text"
                    value={matchedHeader || ''}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || undefined,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full text-sm border rounded-lg p-2 bg-card border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              onClick={() => processMappedData()}
              disabled={schemaFields.filter((f) => f.required).some((f) => !mapping[f.key as keyof Mapping])}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
            >
              Parse Data & Review &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review and Edit Grid */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Editable Grid Table */}
          <div className="overflow-x-auto border rounded-xl bg-card">
            <table className="w-full text-xs text-left min-w-1200px">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="px-3 py-3 w-28">Invoice No *</th>
                  <th className="px-3 py-3 w-28">Date *</th>
                  <th className="px-3 py-3 w-48">Customer Name *</th>
                  <th className="px-3 py-3 w-36">Customer GSTIN</th>
                  <th className="px-3 py-3 w-24">Taxable Value *</th>
                  <th className="px-3 py-3 w-20">GST %</th>
                  <th className="px-3 py-3 w-20">CGST</th>
                  <th className="px-3 py-3 w-20">SGST</th>
                  <th className="px-3 py-3 w-20">IGST</th>
                  <th className="px-3 py-3 w-24">Total Amount</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3 w-32">Status</th>
                  <th className="px-3 py-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-muted">
                      No invoices found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const custStatus = getCustomerStatus(row.customerName, row.customerGstin);
                    return (
                      <tr key={row.id} className={row.errors.length > 0 ? 'bg-red-50/20' : ''}>
                        {/* Invoice No */}
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.invoiceNo}
                            onChange={(e) => handleCellEdit(row.id, 'invoiceNo', e.target.value)}
                            className={`w-full border rounded p-1 ${!row.invoiceNo ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                          />
                        </td>
                        {/* Invoice Date */}
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            value={row.invoiceDate}
                            onChange={(e) => handleCellEdit(row.id, 'invoiceDate', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1"
                          />
                        </td>
                        {/* Customer Name */}
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.customerName}
                            onChange={(e) => handleCellEdit(row.id, 'customerName', e.target.value)}
                            placeholder="Type to map/create"
                            className={`w-full border rounded p-1 ${!row.customerName ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                          />
                          <div className="mt-1 flex items-center">
                            {custStatus.status === 'matched' ? (
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                ✓ System Match
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                + Will auto-create customer
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Customer GSTIN */}
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.customerGstin}
                            onChange={(e) => handleCellEdit(row.id, 'customerGstin', e.target.value)}
                            placeholder="Optional 15-digit GSTIN"
                            className="w-full border border-slate-200 rounded p-1 uppercase"
                          />
                        </td>
                        {/* Taxable Value */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.taxableValue || ''}
                            onChange={(e) => handleCellEdit(row.id, 'taxableValue', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1 text-right"
                          />
                        </td>
                        {/* GST % */}
                        <td className="px-2 py-1.5">
                          <select
                            value={row.gstRate}
                            onChange={(e) => handleCellEdit(row.id, 'gstRate', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        {/* CGST */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.cgst}
                            onChange={(e) => handleCellEdit(row.id, 'cgst', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1 text-right bg-slate-50"
                          />
                        </td>
                        {/* SGST */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.sgst}
                            onChange={(e) => handleCellEdit(row.id, 'sgst', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1 text-right bg-slate-50"
                          />
                        </td>
                        {/* IGST */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.igst}
                            onChange={(e) => handleCellEdit(row.id, 'igst', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1 text-right bg-slate-50"
                          />
                        </td>
                        {/* Total Amount */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.amount || ''}
                            onChange={(e) => handleCellEdit(row.id, 'amount', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1 text-right font-medium"
                          />
                        </td>
                        {/* Description */}
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleCellEdit(row.id, 'description', e.target.value)}
                            placeholder="Optional item details"
                            className="w-full border border-slate-200 rounded p-1"
                          />
                        </td>
                        {/* Errors status tooltip */}
                        <td className="px-3 py-1.5">
                          {row.errors.length === 0 ? (
                            <span className="text-emerald-600 font-semibold flex items-center">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> Valid
                            </span>
                          ) : (
                            <div className="text-red-500 font-semibold flex flex-col group relative">
                              <span className="flex items-center cursor-pointer">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" /> {row.errors.length} Error(s)
                              </span>
                              <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-10 w-64 bg-slate-800 text-white rounded-lg p-2 shadow-lg leading-relaxed text-[10px]">
                                <ul className="list-disc pl-3">
                                  {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                            title="Delete Row"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Import summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Rows</p>
              <p className="text-lg font-bold text-slate-800">{parsedRows.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Errors Found</p>
              <p className={`text-lg font-bold ${parsedRows.some((r) => r.errors.length > 0) ? 'text-red-600' : 'text-emerald-600'}`}>
                {parsedRows.reduce((sum, r) => sum + r.errors.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Taxable Value</p>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(parsedRows.reduce((sum, r) => sum + r.taxableValue, 0))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Import Amount</p>
              <p className="text-lg font-bold text-brand-600">
                {formatCurrency(parsedRows.reduce((sum, r) => sum + r.amount, 0))}
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Back to Mapping
            </button>
            <button
              onClick={handleCommitImport}
              disabled={importMutation.isPending || parsedRows.reduce((sum, r) => sum + r.errors.length, 0) > 0}
              className="px-6 py-2.5 bg-success text-white disabled:opacity-50 rounded-lg text-sm font-bold shadow transition hover:bg-emerald-700"
            >
              {importMutation.isPending ? 'Importing Invoices...' : `Import ${parsedRows.length} Invoices`}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successMessage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-8 w-full max-w-sm shadow-xl border text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Import Successful</h3>
              <p className="text-sm text-muted mt-1">{successMessage}</p>
            </div>
            <button
              onClick={() => { setSuccessMessage(''); onImportSuccess(); }}
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Create Customer Profile</h3>
              <p className="text-xs text-muted">Register a regular vendor or client beforehand to match correctly.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Acme Industries Ltd."
                  className="text-sm border rounded-lg p-2 bg-card border-slate-200 focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-slate-700">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCustomerGstin}
                  onChange={(e) => setNewCustomerGstin(e.target.value)}
                  placeholder="15-digit GST number"
                  className="text-sm border rounded-lg p-2 bg-card border-slate-200 focus:border-brand-500 outline-none uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3 py-1.5 border text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending || !newCustomerName.trim()}
                className="px-4 py-1.5 bg-brand-600 text-white disabled:opacity-50 text-xs font-bold rounded-lg hover:bg-brand-700"
              >
                Create Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
