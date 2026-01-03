import { Supplier } from "../../../core/models/base.model";

export type ServiceType = 'printing' | 'logistics' | 'material' | 'freelancer' | 'other';
export type POStatus = 'draft' | 'sent' | 'approved' | 'partially_received' | 'received' | 'cancelled';

export interface SupplierContact {
  id?: string;
  supplier_id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
}

export interface SupplierDocument {
    id?: string;
    supplier_id?: string;
    title: string;
    file_path: string;
    file_type: string;
    uploaded_at?: string;
}

export interface PurchaseOrderLine {
    id?: string;
    po_id?: string;
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
    expected_delivery_date?: string;
    created_at: string;
    notes?: string;
    lines?: PurchaseOrderLine[];
    supplier?: any;
}

// نرث من Supplier لضمان توافق الحقول الأساسية
export interface SupplierExtended extends Supplier {
  service_type?: ServiceType | string;
  tax_id?: string;
  lead_time_days?: number;
  default_currency?: string;
  balance?: number;
  contacts?: SupplierContact[];
  documents?: SupplierDocument[];
  total_due?: number;
  total_paid?: number;
}
