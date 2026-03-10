import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ExpensesService } from '../../../../features/expenses/expenses.service';
import { Expense } from '../../../../core/models/base.model';
import { Observable } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  providers: [DatePipe, DecimalPipe],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss']
})
export class ExpensesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expensesService = inject(ExpensesService);
  private authService = inject(AuthService);

  expenses$: Observable<Expense[]> = this.expensesService.items;
  isLoading$: Observable<boolean> = this.expensesService.loading;

  showForm = false;
  expenseForm!: FormGroup;
  saving = false;

  ngOnInit(): void {
    this.initForm();
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.expensesService.getExpensesWithRelations().subscribe();
  }

  initForm(): void {
    this.expenseForm = this.fb.group({
      title: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', Validators.required],
      category: ['office', Validators.required],
      expense_date: [new Date().toISOString().split('T')[0], Validators.required],
      payment_method: ['cash', Validators.required],
      notes: ['']
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.expenseForm.reset({
        amount: 0,
        currency: 'USD',
        category: 'office',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash'
      });
    }
  }

  onSubmit(): void {
    if (this.expenseForm.invalid) return;

    this.saving = true;
    const expenseData = this.expenseForm.value;

    // Assign currently logged in user based on logic if available, otherwise assume generic or handle inside service
    const userSub = this.authService.state$.subscribe(authState => {
      const user = authState.user;
      if (user) {
        expenseData.entered_by = user.id;
        // Auto approve for admins if needed, else set false
        expenseData.approved = user.role === 'admin';
        if (expenseData.approved) {
          expenseData.approved_by = user.id;
          expenseData.approved_at = new Date().toISOString();
        }
      } else {
        expenseData.approved = false;
      }

      this.expensesService.create(expenseData).subscribe({
        next: () => {
          this.saving = false;
          // close form and refresh
          this.showForm = false;
          this.expenseForm.reset({
            amount: 0,
            currency: 'USD',
            category: 'office',
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash'
          });
          this.loadExpenses();
        },
        error: (err) => {
          console.error('Error saving expense:', err);
          this.saving = false;
        }
      });
    });
    // Immediately unsubscribe to prevent leaks
    userSub.unsubscribe();
  }

  deleteExpense(id: string): void {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      this.expensesService.delete(id).subscribe({
        next: () => this.loadExpenses()
      });
    }
  }
}
