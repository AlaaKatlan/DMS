import { ContactPerson, Supplier } from "../../../core/models/base.model";

export type ServiceType = 'printing' | 'logistics' | 'material' | 'freelancer' | 'other';
export type POStatus = 'draft' | 'sent' | 'approved' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderLine {
  id?: string;
  po_id?: string;
  book_id?: number | null; // ✅ الربط بالكتاب
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  project_id?: string;
  order_number: string;
  status: POStatus;
  currency: string;
  total_amount: number;
  order_date: string;       // ✅ مطابق لقاعدة البيانات
  expected_delivery?: string; // ✅ مطابق لقاعدة البيانات
  created_at: string;
  notes?: string;
  lines?: PurchaseOrderLine[];
  supplier?: any;
  total_paid?: number; // للعرض فقط
  remaining?: number;  // للعرض فقط
}

export interface SupplierExtended extends Supplier {
  service_type?: ServiceType | string;
  tax_id?: string;
  lead_time_days?: number;
  default_currency?: string;
  balance?: number;
  total_due?: number;
  total_paid?: number;
  contacts?: ContactPerson[];
}
