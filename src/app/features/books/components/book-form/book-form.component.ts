import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BooksService } from '../../books.service';
import { LucideAngularModule } from 'lucide-angular';
import { Country } from '../../../../core/models/base.model';

@Component({
  selector: 'app-book-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './book-form.component.html',
  styleUrls: ['./book-form.component.scss']
})
export class BookFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private booksService = inject(BooksService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  bookForm!: FormGroup;
  isEditMode = false;
  bookId: number | null = null;
  isLoading = false;
  isSubmitting = false;
  countries: Country[] = []; // يفترض جلبها من خدمة عامة

  ngOnInit() {
    this.initForm();
    // this.loadCountries(); // قم بتفعيل هذا السطر إذا كان لديك خدمة للبلدان

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.bookId = +params['id'];
        this.loadBookData(this.bookId);
      }
    });
  }

  initForm() {
    this.bookForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      author: ['', Validators.required],
      isbn: [''],
      publisher: [''],
      category: [''],
      publication_year: [new Date().getFullYear(), [Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      price_usd: [0, [Validators.required, Validators.min(0)]],
      price_syp: [0],
      cost_usd: [0],
      quantity: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      country_id: [null],
      cover_image: [''] // يمكن ربطه بمكون رفع ملفات
    });
  }

  loadBookData(id: number) {
    this.isLoading = true;
    this.booksService.getBookDetail(id).subscribe({
      next: (book) => {
        if (book) {
          this.bookForm.patchValue(book);
          // في حال التعديل، قد نود تعطيل حقل الكمية ليتم تعديله عبر حركات المخزون حصراً
          // this.bookForm.get('quantity')?.disable();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        alert('حدث خطأ أثناء تحميل بيانات الكتاب');
        this.router.navigate(['/books']);
      }
    });
  }

  onSubmit() {
    if (this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.bookForm.getRawValue(); // استخدام getRawValue لضمان أخذ الحقول المعطلة إن وجدت

    const request$ = this.isEditMode && this.bookId
      ? this.booksService.updateBook(this.bookId, formData)
      : this.booksService.create(formData);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        // يفضل استخدام Toastr هنا
        alert(this.isEditMode ? 'تم تحديث بيانات الكتاب بنجاح' : 'تم إضافة الكتاب بنجاح');
        this.router.navigate(['/books']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
        alert('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
      }
    });
  }
}
