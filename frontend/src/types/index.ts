export interface User {
  id: string;
  name: string;
  email: string;
  role: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Business {
  id: string;
  name: string;
  gstin: string;
}

export interface DashboardSummary {
  gstPayable: number;
  availableItc: number;
  netLiability: number;
  sales: number;
  purchases: number;
  healthScore: number;
  upcomingDueDates: ComplianceAlert[];
  alerts: Alert[];
}

export interface ComplianceAlert {
  title: string;
  filingType: string;
  dueDate: string;
  daysRemaining: number;
}

export interface Alert {
  type: string;
  message: string;
  severity: string;
}

export interface ItcMismatch {
  id: string;
  vendorName: string;
  vendorGstin?: string;
  invoiceNo: string;
  expectedItc: number;
  reportedItc: number;
  potentialLoss: number;
  issue: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  amount: number;
  gstAmount: number;
  status: string;
  customerName?: string;
}

export interface Customer {
  id: string;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
}

export interface BulkImportInvoice {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGstin?: string;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
  description?: string;
}

