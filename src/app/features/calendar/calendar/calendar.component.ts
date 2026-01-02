import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService, CalendarEvent } from '../calendar.service';
import { LucideAngularModule } from 'lucide-angular';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef); // 1. حقن أداة التحديث

  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  events: CalendarEvent[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.calendarService.getAllEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.generateCalendar();
        this.loading = false;

        // 2. إجبار الصفحة على التحديث فور وصول البيانات
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading calendar events:', err);
        this.loading = false;
        this.cdr.detectChanges(); // تحديث لإزالة مؤشر التحميل عند الخطأ
      }
    });
  }

  generateCalendar(): void {
    this.calendarDays = [];

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // أول يوم في الشهر
    const firstDayOfMonth = new Date(year, month, 1);

    // تحديد بداية التقويم (العودة لأول يوم في الأسبوع لملء الصف)
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // تحديد نهاية التقويم (6 صفوف * 7 أيام = 42 خلية)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41);

    const loopDate = new Date(startDate);

    while (loopDate <= endDate) {
      const dateString = loopDate.toISOString().split('T')[0];

      // البحث عن الأحداث لهذا اليوم
      const dayEvents = this.events.filter(e => e.date === dateString);

      this.calendarDays.push({
        date: new Date(loopDate),
        isCurrentMonth: loopDate.getMonth() === month,
        isToday: this.isToday(loopDate),
        events: dayEvents
      });

      loopDate.setDate(loopDate.getDate() + 1);
    }
  }

  changeMonth(offset: number): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + offset, 1);
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.generateCalendar();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
}
