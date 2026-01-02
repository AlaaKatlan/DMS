// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  // Redirect root to dashboard
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // Auth Routes (without Layout) - فقط للـ Guests
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      }
    ]
  },

  // Main App Routes (with Layout) - محمية بـ authGuard
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Customers
      {
        path: 'customers',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/customers/components/customer-list/customer-list.component').then(m => m.CustomerListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/customers/components/customer-form/customer-form.component').then(m => m.CustomerFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/customers/components/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/customers/components/customer-form/customer-form.component').then(m => m.CustomerFormComponent)
          }
        ]
      },

      // Suppliers
      {
        path: 'suppliers',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/suppliers/components/supplier-list/supplier-list.component').then(m => m.SupplierListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/suppliers/components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/suppliers/components/supplier-detail/supplier-detail.component').then(m => m.SupplierDetailComponent)
          }
        ]
      },

      // Books
      {
        path: 'books',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/books/components/book-list/book-list.component').then(m => m.BookListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/books/components/book-form/book-form.component').then(m => m.BookFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/books/components/book-detail/book-detail.component').then(m => m.BookDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/books/components/book-form/book-form.component').then(m => m.BookFormComponent)
          }
        ]
      },

      // Projects
      {
        path: 'projects',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/projects/components/project-list/project-list.component').then(m => m.ProjectListComponent)
          },
          {
            path: 'board',
            loadComponent: () => import('./features/projects/components/project-kanban/project-kanban.component').then(m => m.ProjectKanbanComponent)
          },
          {
            path: 'timeline',
            loadComponent: () => import('./features/projects/components/project-timeline/project-timeline.component').then(m => m.ProjectTimelineComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/projects/components/project-form/project-form.component').then(m => m.ProjectFormComponent)
          },
          // 👇 تمت إضافة مسار التعديل هنا (يجب أن يكون قبل :id)
          {
            path: ':id/edit',
            loadComponent: () => import('./features/projects/components/project-form/project-form.component').then(m => m.ProjectFormComponent)
          },
          // 👆
          {
            path: ':id',
            loadComponent: () => import('./features/projects/components/project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
          }
        ]
      },


       // Tasks
      {
        path: 'tasks',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/tasks/components/task-list/task-list.component').then(m => m.TaskListComponent)
          },
          // ✅ الترتيب الصحيح: الروابط الثابتة أولاً
          {
            path: 'board',
            loadComponent: () => import('./features/tasks/components/task-board/task-board.component').then(m => m.TaskBoardComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/tasks/components/task-form/task-form.component').then(m => m.TaskFormComponent)
          },
          // ✅ ثم الروابط المتغيرة (التي تحتوي على :id)
          {
            path: ':id/edit', // التعديل (الأكثر تحديداً) قبل التفاصيل
            loadComponent: () => import('./features/tasks/components/task-form/task-form.component').then(m => m.TaskFormComponent)
          },
          {
            path: ':id', // التفاصيل (الأكثر عمومية) في النهاية
            loadComponent: () => import('./features/tasks/components/task-detail/task-detail.component').then(m => m.TaskDetailComponent)
          }
        ]
      },

      // Invoices
      {
        path: 'invoices',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/invoices/components/invoice-list/invoice-list.component').then(m => m.InvoiceListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/invoices/components/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent)
          },
          // 👇 أضف هذا المسار (تعديل) ويجب أن يكون قبل المسار العام (:id)
          {
            path: ':id/edit',
            loadComponent: () => import('./features/invoices/components/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent)
          },
          // 👆
          {
            path: ':id',
            loadComponent: () => import('./features/invoices/components/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent)
          }
        ]
      },

      // Accounting - فقط للـ Admin & Accountant
      {
        path: 'accounting',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'accountant', 'manager'] },
        children: [
          {
            path: '',
            redirectTo: 'ledger',
            pathMatch: 'full'
          },
          {
            path: 'ledger',
            loadComponent: () => import('./features/accounting/components/ledger/ledger.component').then(m => m.LedgerComponent)
          },
          {
            path: 'expenses',
            loadComponent: () => import('./features/accounting/components/expenses/expenses.component').then(m => m.ExpensesComponent)
          },
          {
            path: 'reports',
            loadComponent: () => import('./features/accounting/components/reports/reports.component').then(m => m.ReportsComponent)
          }
        ]
      },

      // Calendar
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar/calendar.component').then(m => m.CalendarComponent)
      },

      // Settings - فقط للـ Admin & Manager
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'manager'] },
        children: [
          {
            path: '',
            redirectTo: 'profile',
            pathMatch: 'full'
          },
          {
            path: 'profile',
            loadComponent: () => import('./features/settings/components/profile/profile.component').then(m => m.ProfileComponent)
          },
          {
            path: 'users',
            loadComponent: () => import('./features/settings/components/users/users.component').then(m => m.UsersComponent)
          }
        ]
      }
    ]
  },

  // Unauthorized
  {
    path: 'unauthorized',
    loadComponent: () => import('./shared/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  // 404
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
