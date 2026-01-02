import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import localeEn from '@angular/common/locales/en'; // 1. استيراد الإنجليزية

import {
  LucideAngularModule, FolderOpen,
  DollarSign, TrendingUp, ArrowDown, Activity, Users, FileX,
  Folder, CheckSquare, FileText, AlertCircle, Package, Menu, Search, PlusCircle, Book,
  Bell, LayoutDashboard, Truck, BookOpen, Calendar, Settings, ChevronRight, MoreVertical, Mail,
  Lock, Grid, Plus, FileQuestion, Edit3, CircleCheck, PenLine,
  Eye, Trash2, Edit, Filter, X, Check, Map, Hash, CreditCard, ArrowRight, Loader2, LoaderCircle,
  EyeOff, List, Building, Trash, ChartBar, ChartColumn, Briefcase, Workflow, Printer,
  LogIn, MapPin, ChevronLeft, ArrowLeft, CircleAlert, Columns, Columns2, Ruler, Kanban, Clock,
  UserPlus, Phone, Tag, CheckCircle, Flag, Handshake, TrendingDown, Image, XCircle, CircleX, Pen, ShoppingCart,
  User, Sliders, Download,
  LogOut,Save,
  Info
} from 'lucide-angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

// 2. تعديل بيانات اللغة العربية باستخدام بيانات الإنجليزية
// نستخدم (any) هنا لحل مشكلة الخطأ الذي يظهر لك
const localeArModified: any = [...localeAr];
const localeEnData: any = localeEn;

// نسخ رموز الأرقام (النقطة، الفاصلة) من الإنجليزية إلى العربية
// هذا يضمن أن الفاصلة العشرية تصبح (.) وليس (٫) وأن فاصلة الآلاف (,)
localeArModified[14] = localeEnData[14];

// نسخ أنماط العملات والأرقام لضمان التنسيق الغربي
localeArModified[15] = localeEnData[15];

// تسجيل اللغة المعدلة
registerLocaleData(localeArModified, 'ar-SA');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),

    importProvidersFrom(LucideAngularModule.pick({
      DollarSign, TrendingUp, ArrowDown, Activity, Users, ChevronLeft, Grid, FolderOpen, Sliders, Pen,
      Folder, CheckSquare, FileText, AlertCircle, Package, Menu, Search, Flag, Handshake, Briefcase, Workflow,
      Bell, LayoutDashboard, Truck, BookOpen, Calendar, Settings, ChevronRight, MoreVertical, Printer, Download,
      Mail, MapPin, FileQuestion, PlusCircle, CheckCircle, FileX, Loader2, LoaderCircle, ShoppingCart,
      Lock, List, Check, Map, Building, Trash, Hash, CreditCard, ArrowRight, Edit3, CircleCheck,
      Eye, Phone, Plus, ArrowLeft, CircleAlert, Book, Ruler, Image, PenLine, Kanban, CircleX,
      EyeOff, UserPlus, ChartBar, ChartColumn, TrendingDown, Clock, XCircle,
      LogIn, Trash2, Edit, Filter, Columns2, Tag,
      User, X,
      LogOut,Save,
      Info
    })),

    // استخدام اللغة العربية (التي عدلناها لتقبل تنسيق الأرقام الإنجليزي)
    { provide: LOCALE_ID, useValue: 'ar-SA' }
  ]
};
