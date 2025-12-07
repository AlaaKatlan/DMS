// src/app/features/auth/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule, LucideAngularModule,

  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.signIn(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.error = 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.';
        this.loading = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get emailError(): string {
    const email = this.loginForm.get('email');
    if (email?.hasError('required') && email.touched) {
      return 'البريد الإلكتروني مطلوب';
    }
    if (email?.hasError('email') && email.touched) {
      return 'البريد الإلكتروني غير صحيح';
    }
    return '';
  }

  get passwordError(): string {
    const password = this.loginForm.get('password');
    if (password?.hasError('required') && password.touched) {
      return 'كلمة المرور مطلوبة';
    }
    if (password?.hasError('minlength') && password.touched) {
      return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    return '';
  }
}
