// src/app/features/books/components/book-form/book-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BooksService } from '../../books.service';
import { LucideAngularModule } from 'lucide-angular';
import { Country, Book } from '../../../../core/models/base.model';

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

  countries: Country[] = [
    { id: 1, name: 'سوريا', code: 'SY' },
    { id: 2, name: 'الإمارات', code: 'AE' },
    { id: 3, name: 'قطر', code: 'QA' },
    { id: 4, name: 'لبنان', code: 'LB' }
  ];

  ngOnInit() {
    this.initForm();
    this.setupCurrencyLogic();
    this.setDefaultCountry();

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
      title: ['', [Validators.required]],
      author: [''],
      publisher: ['دار الزيبق'],
      isbn: [''],
      category: [''],
      year: [new Date().getFullYear()],
      country_id: [null],
      stock_quantity: [0, [Validators.min(0)]],
      price_usd: [0, [Validators.min(0)]],
      price_aed: [0, [Validators.min(0)]],
      price_qr: [0, [Validators.min(0)]],
      price_syp: [0, [Validators.min(0)]],
      cost_usd: [0, [Validators.min(0)]],
      cost_syp: [0, [Validators.min(0)]],
      height_cm: [null],
      width_cm: [null],
      cover_type: [''],
      pages: [null],
      cover_image_url: [''],
      cover_image_extention: ['.jpg'],
      file_url: [''],
      description: ['']
    });
  }

  setupCurrencyLogic() {
    this.bookForm.get('price_aed')?.valueChanges.subscribe(val => {
      if (val !== null) {
        this.bookForm.patchValue({ price_qr: val }, { emitEvent: false });
      }
    });
  }

  setDefaultCountry() {
    if (!this.isEditMode) {
      const syria = this.countries.find(c => c.name.includes('سوريا') || c.code === 'SY');
      if (syria) {
        this.bookForm.patchValue({ country_id: syria.id });
      }
    }
  }

  loadBookData(id: number) {
    this.isLoading = true;
    this.booksService.getBookDetail(id).subscribe({
      next: (book) => {
        if (book) {
          this.bookForm.patchValue({
            ...book,
            stock_quantity: book.stock_quantity || 0
          });
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
    const formData = this.bookForm.getRawValue();

    const request$ = this.isEditMode && this.bookId
      ? this.booksService.updateBook(this.bookId, formData)
      : this.booksService.create(formData);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        alert(this.isEditMode ? 'تم تحديث الكتاب بنجاح' : 'تم إضافة الكتاب بنجاح');
        this.router.navigate(['/books']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
        alert('حدث خطأ أثناء الحفظ');
      }
    });
  }
}
