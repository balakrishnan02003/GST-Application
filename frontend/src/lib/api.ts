import axios from 'axios';
import type { AuthResponse, Business, DashboardSummary, Invoice, ItcMismatch, Customer, BulkImportInvoice } from '../types';

const backendBase = import.meta.env.DEV ? 'http://localhost:5253/api' : '/api';

const api = axios.create({
  baseURL: backendBase,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  register: (data: { name: string; email: string; password: string; role: number }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
};

export const businessApi = {
  list: () => api.get<Business[]>('/businesses').then((r) => r.data),
  create: (data: { name: string; gstin: string }) =>
    api.post<Business>('/businesses', data).then((r) => r.data),
};

export const dashboardApi = {
  summary: (businessId: string) =>
    api.get<DashboardSummary>(`/businesses/${businessId}/dashboard`).then((r) => r.data),
};

export const itcApi = {
  mismatches: (businessId: string) =>
    api.get<ItcMismatch[]>(`/businesses/${businessId}/itc/mismatches`).then((r) => r.data),
};

export const invoiceApi = {
  list: (businessId: string) =>
    api.get<Invoice[]>(`/businesses/${businessId}/invoices`).then((r) => r.data),
  bulkImport: (businessId: string, data: BulkImportInvoice[]) =>
    api.post<{ count: number; message: string }>(`/businesses/${businessId}/invoices/bulk`, data).then((r) => r.data),
  delete: (businessId: string, invoiceId: string) =>
    api.delete(`/businesses/${businessId}/invoices/${invoiceId}`).then((r) => r.data),
};

export const customerApi = {
  list: (businessId: string) =>
    api.get<Customer[]>(`/businesses/${businessId}/customers`).then((r) => r.data),
  create: (businessId: string, data: { name: string; gstin?: string; email?: string; phone?: string }) =>
    api.post<Customer>(`/businesses/${businessId}/customers`, data).then((r) => r.data),
};

export const uploadApi = {
  gstr1: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/businesses/${businessId}/uploads/gstr-1`, form).then((r) => r.data);
  },
  gstr2b: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/businesses/${businessId}/uploads/gstr-2b`, form).then((r) => r.data);
  },
  gstr3b: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/businesses/${businessId}/uploads/gstr-3b`, form).then((r) => r.data);
  },
  ledger: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/businesses/${businessId}/uploads/ledger`, form).then((r) => r.data);
  },
};

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
