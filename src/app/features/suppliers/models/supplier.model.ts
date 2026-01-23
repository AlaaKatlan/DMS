import { ContactPerson, Supplier } from "../../../core/models/base.model";

export type ServiceType = 'printing' | 'logistics' | 'material' | 'freelancer' | 'other';
export type POStatus = 'draft' | 'sent' | 'approved' | 'partially_received' | 'received' | 'cancelled';

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

export interface SupplierExtended extends Supplier {
  service_type?: ServiceType | string;
  tax_id?: string;
  lead_time_days?: number;
  default_currency?: string;
  balance?: number;
  total_due?: number;
  total_paid?: number;
  // ✅ إعادة جهات الاتصال
  contacts?: ContactPerson[];
}
