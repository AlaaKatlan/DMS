// src/app/core/models/base.model.ts

/**
 * Base Interface لكل الجداول
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Query Parameters للتصفية والبحث
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== USER & AUTH ====================

export interface UserProfile extends BaseEntity {
  role: UserRole;
  full_name: string;
  full_name_p: string;
  phone?: string;
  avatar_url?: string;
  email?: string;
}

export type UserRole =
  | 'admin'
  | 'manager'
  | 'accountant'
  | 'data_entry'
  | 'employee'
  | 'freelancer'
  | 'client';

// ==================== CUSTOMERS ====================

export interface Customer extends BaseEntity {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type_id?: number;
  country_id?: number;
  notes?: string;
  completed_at?: string; // ← أضف هذا
  customer_type?: CustomerType;
  country?: Country;
  projects?: Project[];
  invoices?: Invoice[];
}

export interface CustomerType {
  id: number;
  name: string;
  description?: string;
}

export interface Country {
  id: number;
  name: string;
  code?: string;
}

// ==================== SUPPLIERS ====================

export interface Supplier extends BaseEntity {
  name: string;
  type?: string;
  phone?: string;
  country_id?: number;
  total_due?: number;
  total_paid?: number;
  notes?: string;

  country?: Country;
  payments?: SupplierPayment[];
  print_orders?: PrintOrder[];
}

export interface SupplierPayment extends BaseEntity {
  supplier_id: string;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  transfer_ref?: string;
  transfer_company?: string;
  receipt_path?: string;
  paid_at: string;
  notes?: string;

  supplier?: Supplier;
}

// ==================== BOOKS ====================

export interface Book {
  book_id: number;
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  category?: string;
  year?: number;
  country_id?: number;
stock_quantity?: number;
  price_qr?: number;
  price_aed?: number;
  price_usd?: number;
  price_syp?: number;

  cost_usd?: number;
  cost_syp?: number;
   height_cm?: number;
  width_cm?: number;
  cover_type?: string;
publication_year?: number;
  cover_image_url?: string;
  cover_image_extention?: string;
  file_url?: string;
  pages?: any;

  description?: string;
  created_at: string;

  country?: Country;
  images?: BookImage[];
  inventory?: InventoryLog[];
}

export interface BookImage extends BaseEntity {
  book_id: string;
  image_url: string;
  caption?: string;
}

export interface InventoryLog extends BaseEntity {
  book_id: number;
  type: 'in' | 'out';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;

  book?: Book;
}
export interface BookFilters {
  search?: string;
  category?: string;
  country_id?: number;
}
// ==================== PROJECTS ====================

export interface Project extends BaseEntity {
  title: string;
  customer_id: string;
  description?: string;
  project_type?: string;
  total_price?: number;

  currency: Currency;
  status: ProjectStatus;
  start_date?: string;
  due_date?: string;
  notes?: string;
  completed_at?: string; // ← أضف هذا

  customer?: Customer;
  tasks?: ProjectTask[];
  milestones?: ProjectMilestone[];
  invoices?: Invoice[];
  expenses?: Expense[];
}

export type ProjectStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';

export interface ProjectMilestone extends BaseEntity {
  project_id: string;
  title: string;
  amount?: number;
  due_date?: string;
  status: 'pending' | 'completed';
  completed_at?: string;

  project?: Project;
}

// ==================== TASKS ====================

export interface ProjectTask extends BaseEntity {
  project_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  task_type: 'parallel' | 'serial';
  status: TaskStatus;
  priority?: TaskPriority;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  quantity?: number;
  unit_price?: number;
  attachment_path?: string;
  notes?: string;

  project?: Project;
  assignee?: UserProfile;
  dependencies?: ProjectTask[];
  dependent_tasks?: ProjectTask[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskDependency {
  task_id: string;
  depends_on_task_id: string;
}

// ==================== INVOICES ====================

export interface Invoice extends BaseEntity {
  invoice_number: string;
  customer_id: string;
  project_id?: string;
  amount_due: number;
  currency: Currency;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string;
  tax_rate?: number;
  tax_amount?: number;
  discount?: number;
  notes?: string;

  customer?: Customer;
  project?: Project;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem extends BaseEntity {
  invoice_id: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  book_id?: number;

  invoice?: Invoice;
  book?: Book;
}

export interface InvoicePayment extends BaseEntity {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transfer_ref?: string;
  receipt_path?: string;
  paid_at: string;
  notes?: string;

  invoice?: Invoice;
}

// ==================== EXPENSES ====================

export interface Expense extends BaseEntity {
  title: string;
  amount: number;
  currency: Currency;
  expense_date: string;
  payment_method?: PaymentMethod;
  receipt_path?: string;
  project_id?: string;
  category?: ExpenseCategory;
  entered_by: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;

  project?: Project;
  entered_by_user?: UserProfile;
  approved_by_user?: UserProfile;
}

export type ExpenseCategory =
  | 'electricity'
  | 'water'
  | 'rent'
  | 'maintenance'
  | 'supplies'
  | 'subscriptions'
  | 'salaries'
  | 'other';

// ==================== PRINT ORDERS ====================

export interface PrintOrder extends BaseEntity {
  book_id: number;
  supplier_id: string;
  quantity: number;
  total_cost?: number;
  status: PrintOrderStatus;
  order_date: string;
  delivery_date?: string;
  notes?: string;

  book?: Book;
  supplier?: Supplier;
  payments?: PrintOrderPayment[];
}

export type PrintOrderStatus = 'ordered' | 'printing' | 'ready' | 'delivered' | 'cancelled';

export interface PrintOrderPayment extends BaseEntity {
  print_order_id: string;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  receipt_path?: string;
  paid_at: string;
  notes?: string;

  print_order?: PrintOrder;
}

// ==================== ACCOUNTING ====================

export interface LedgerEntry extends BaseEntity {
  entry_type: 'income' | 'expense';
  amount: number;
  currency: Currency;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  entry_date: string;
  category?: string;
}

export interface AccountBalance {
  currency: Currency;
  total_income: number;
  total_expenses: number;
  balance: number;
  as_of_date: string;
}

// ==================== CALENDAR ====================

export interface CalendarEvent extends BaseEntity {
  title: string;
  description?: string;
  event_type: CalendarEventType;
  reference_id?: string;
  event_date: string;
  end_date?: string;
  all_day: boolean;
  reminder_enabled: boolean;
  reminder_minutes?: number;
  created_by: string;

  creator?: UserProfile;
}

export type CalendarEventType =
  | 'task'
  | 'payment'
  | 'meeting'
  | 'reminder'
  | 'deadline'
  | 'delivery';

// ==================== CREDENTIALS ====================

export interface Credential extends BaseEntity {
  system_name: string;
  url?: string;
  username?: string;
  password?: string;
  customer_id?: string;
  project_id?: string;
  notes?: string;
  last_used?: string;

  customer?: Customer;
  project?: Project;
}

// ==================== FREELANCER PAYMENTS ====================

export interface FreelancerPayment extends BaseEntity {
  freelancer_id: string;
  task_id: string;
  amount: number;
  currency: Currency;
  paid: boolean;
  paid_at?: string;
  transfer_ref?: string;
  receipt_path?: string;
  notes?: string;

  freelancer?: UserProfile;
  task?: ProjectTask;
}

// ==================== ACTIVITY LOG ====================

export interface ActivityLog extends BaseEntity {
  actor_id: string;
  action: 'created' | 'updated' | 'deleted';
  table_name: string;
  record_id: string;
  old_value?: any;
  new_value?: any;

  actor?: UserProfile;
}

// ==================== COMMON TYPES ====================

export type Currency = 'USD' | 'AED' | 'QR' | 'SYP' | 'OMR';

export type PaymentMethod = 'cash' | 'transfer' | 'bank' | 'check' | 'card';

// ==================== STATISTICS ====================

export interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  activeProjects: number;
  overdueProjects: number;
  pendingTasks: number;
  overdueTasks: number;
  lowStockBooks: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  averageCompletionTime: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

export interface CustomerStats {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  totalPaid: number;
  totalDue: number;
  lastProjectDate?: string;
}

// ==================== REPORTS ====================

export interface ReportFilter {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  projectId?: string;
  bookId?: number;
  supplierId?: string;
  currency?: Currency;
  status?: string;
}

export interface SalesReport {
  period: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  currency: Currency;
  topBooks: Array<{
    book: Book;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  topCustomers: Array<{
    customer: Customer;
    revenue: number;
    projectCount: number;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    cost: number;
    profit: number;
  }>;
}

export interface InventoryReport {
  totalBooks: number;
  totalValue: number;
  lowStockBooks: Book[];
  recentMovements: InventoryLog[];
}

// ==================== EDUCATIONAL MATERIALS ====================

export interface EducationalMaterial extends BaseEntity {
  name: string;
  description?: string;
  price_qr?: number;
  price_aed?: number;
  price_usd?: number;
  price_syp?: number;
  cost_usd?: number;
  cost_syp?: number;
}

// ==================== GAMES ====================

export interface Game {
  id: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  game_type?: string;
  launch_url?: string;
  created_at: string;
}

export interface UserCoins {
  user_id: string;
  coins: number;
  updated_at: string;
}

// ==================== NOTIFICATION ====================

export interface Notification extends BaseEntity {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_type?: string;
  reference_id?: string;
  read: boolean;
  read_at?: string;

  user?: UserProfile;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'payment_received'
  | 'payment_due'
  | 'invoice_overdue'
  | 'project_deadline'
  | 'expense_approved'
  | 'system';
