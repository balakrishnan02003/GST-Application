import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useBusiness } from '../context/BusinessContext';
import { customerApi, invoiceApi, formatCurrency } from '../lib/api';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  description: string;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
}

export default function CreateInvoiceModal({ onClose, onSuccess }: CreateInvoiceModalProps) {
  const { activeBusiness } = useBusiness();
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerGstin, setNewCustomerGstin] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: '',
      taxableValue: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      amount: 0,
    },
  ]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', activeBusiness?.id],
    queryFn: () => customerApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  // Recalculate taxes when customer selection changes
  useEffect(() => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.taxableValue <= 0) return item;
        
        const totalTax = (item.taxableValue * item.gstRate) / 100;
        const businessState = activeBusiness?.gstin.substring(0, 2);
        
        let customerState = businessState;
        if (showNewCustomer && newCustomerGstin) {
          customerState = newCustomerGstin.substring(0, 2);
        } else if (selectedCustomerId) {
          const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
          if (selectedCustomer?.gstin) {
            customerState = selectedCustomer.gstin.substring(0, 2);
          }
        }

        if (customerState && businessState && customerState !== businessState) {
          return {
            ...item,
            igst: totalTax,
            cgst: 0,
            sgst: 0,
            amount: item.taxableValue + totalTax,
          };
        } else {
          return {
            ...item,
            cgst: totalTax / 2,
            sgst: totalTax / 2,
            igst: 0,
            amount: item.taxableValue + totalTax,
          };
        }
      })
    );
  }, [selectedCustomerId, showNewCustomer, newCustomerGstin, activeBusiness?.gstin, customers]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (_data: unknown) => {
      // First create customer if needed (auto-create on import)
      if (showNewCustomer && newCustomerName.trim()) {
        await customerApi.create(activeBusiness!.id, {
          name: newCustomerName.trim(),
          gstin: newCustomerGstin.trim() || undefined,
        });
      }

      const customerData = showNewCustomer 
        ? { name: newCustomerName, gstin: newCustomerGstin }
        : customers.find(c => c.id === selectedCustomerId) || { name: '', gstin: undefined };

      // Create separate invoice record for each line item, or combine them based on backend requirement
      // For now, combining all line items into a single invoice record
      const totalTaxableValue = lineItems.reduce((sum, item) => sum + item.taxableValue, 0);
      const totalCgst = lineItems.reduce((sum, item) => sum + item.cgst, 0);
      const totalSgst = lineItems.reduce((sum, item) => sum + item.sgst, 0);
      const totalIgst = lineItems.reduce((sum, item) => sum + item.igst, 0);
      const totalGst = totalCgst + totalSgst + totalIgst;
      const totalAmount = totalTaxableValue + totalGst;

      return invoiceApi.bulkImport(activeBusiness!.id, [
        {
          invoiceNo,
          invoiceDate,
          customerName: customerData.name || '',
          customerGstin: customerData.gstin,
          taxableValue: totalTaxableValue,
          gstRate: lineItems[0]?.gstRate || 18, // Use first item's rate as default
          cgst: totalCgst,
          sgst: totalSgst,
          igst: totalIgst,
          amount: totalAmount,
          description: lineItems.map(item => item.description).filter(Boolean).join(' | '),
        },
      ]);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create invoice');
    },
  });

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let updatedItem = { ...item, [field]: value };

        // Auto-calculate taxes when taxable value or rate changes
        if (field === 'taxableValue' || field === 'gstRate') {
          const totalTax = (updatedItem.taxableValue * updatedItem.gstRate) / 100;
          const businessState = activeBusiness?.gstin.substring(0, 2);
          
          // Determine customer state from selected customer or new customer GSTIN
          let customerState = businessState;
          if (showNewCustomer && newCustomerGstin) {
            customerState = newCustomerGstin.substring(0, 2);
          } else if (selectedCustomerId) {
            const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
            if (selectedCustomer?.gstin) {
              customerState = selectedCustomer.gstin.substring(0, 2);
            }
          }

          if (customerState && businessState && customerState !== businessState) {
            updatedItem.igst = totalTax;
            updatedItem.cgst = 0;
            updatedItem.sgst = 0;
          } else {
            updatedItem.cgst = totalTax / 2;
            updatedItem.sgst = totalTax / 2;
            updatedItem.igst = 0;
          }
          updatedItem.amount = updatedItem.taxableValue + updatedItem.cgst + updatedItem.sgst + updatedItem.igst;
        }

        return updatedItem;
      })
    );
  };

  const addLineItem = () => {
    const newId = (lineItems.length + 1).toString();
    setLineItems((prev) => [
      ...prev,
      {
        id: newId,
        description: '',
        taxableValue: 0,
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // Validation
      if (!invoiceNo.trim()) {
        setError('Invoice number is required');
        return;
      }
      if (!invoiceDate) {
        setError('Invoice date is required');
        return;
      }
      // Validate invoice date is not in the future
      const selectedDate = new Date(invoiceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        setError('Invoice date cannot be in the future');
        return;
      }
      if (!selectedCustomerId && !showNewCustomer) {
        setError('Please select a customer or create a new one');
        return;
      }
      if (showNewCustomer && !newCustomerName.trim()) {
        setError('Customer name is required');
        return;
      }
      if (lineItems.length === 0) {
        setError('At least one line item is required');
        return;
      }
      if (lineItems.some(item => !item.description?.trim())) {
        setError('All line items must have a description');
        return;
      }
      if (lineItems.some(item => item.taxableValue <= 0)) {
        setError('All line items must have taxable value greater than 0');
        return;
      }

      await createInvoiceMutation.mutateAsync({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTaxableValue = lineItems.reduce((sum, item) => sum + item.taxableValue, 0);
  const totalGst = lineItems.reduce((sum, item) => sum + item.cgst + item.sgst + item.igst, 0);
  const totalAmount = totalTaxableValue + totalGst;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto shadow-xl border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Create New Invoice</h3>
            <p className="text-xs text-muted">Fill in the details to create a GST invoice</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-lg text-sm font-semibold"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="INV-001"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Date *</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
              />
            </div>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Customer *</label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setShowNewCustomer(false);
                  }}
                  className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5"
                >
                  <option value="">Select existing customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.gstin ? `(${customer.gstin})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  {showNewCustomer ? 'Cancel' : '+ New Customer'}
                </button>
              </div>

              {showNewCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={newCustomerGstin}
                      onChange={(e) => setNewCustomerGstin(e.target.value)}
                      placeholder="15-digit GSTIN"
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 uppercase"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium">Line Items *</label>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-sm font-semibold transition"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-right w-24">Taxable Value</th>
                    <th className="px-3 py-3 text-center w-20">GST %</th>
                    <th className="px-3 py-3 text-right w-20">CGST</th>
                    <th className="px-3 py-3 text-right w-20">SGST</th>
                    <th className="px-3 py-3 text-right w-20">IGST</th>
                    <th className="px-3 py-3 text-right w-24">Amount</th>
                    <th className="px-3 py-3 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.taxableValue || ''}
                          onChange={(e) => handleLineItemChange(item.id, 'taxableValue', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.gstRate}
                          onChange={(e) => handleLineItemChange(item.id, 'gstRate', parseFloat(e.target.value))}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.cgst || ''}
                          onChange={(e) => handleLineItemChange(item.id, 'cgst', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-right bg-slate-50"
                          readOnly
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.sgst || ''}
                          onChange={(e) => handleLineItemChange(item.id, 'sgst', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-right bg-slate-50"
                          readOnly
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.igst || ''}
                          onChange={(e) => handleLineItemChange(item.id, 'igst', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-right bg-slate-50"
                          readOnly
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.amount || ''}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-right font-medium bg-slate-50"
                          readOnly
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted">Total Taxable Value</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(totalTaxableValue)}</p>
              </div>
              <div>
                <p className="text-muted">Total GST</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(totalGst)}</p>
              </div>
              <div>
                <p className="text-muted">Total Amount</p>
                <p className="text-xl font-bold text-brand-600">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 rounded-lg text-sm font-bold transition"
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}