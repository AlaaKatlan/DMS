import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';

// 1. Import Lucide Module and ALL the icons you need across the app
import {
  LucideAngularModule,FolderOpen,
  DollarSign, TrendingUp, ArrowDown, Activity, Users,
  Folder, CheckSquare, FileText, AlertCircle, Package, Menu, Search,PlusCircle,
  // NEW ICONS BELOW:
  Bell, LayoutDashboard, Truck, BookOpen, Calendar, Settings, ChevronRight, MoreVertical, Mail,
  Lock, Grid, Plus, FileQuestion,Edit3,CircleCheck,PenLine,
  Eye, Trash2, Edit, Filter, X, Check, Map, Hash,CreditCard,ArrowRight,
  EyeOff, List, Building, Trash,ChartBar,ChartColumn,
  LogIn, MapPin, ChevronLeft, ArrowLeft,CircleAlert,Columns,Columns2,
  UserPlus, Phone,Tag,CheckCircle,
  // ADD THESE IF MISSING:
  User,
  LogOut,
  Info
} from 'lucide-angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

registerLocaleData(localeAr, 'ar');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),

    // 2. Register icons globally here using importProvidersFrom
    importProvidersFrom(LucideAngularModule.pick({
      DollarSign, TrendingUp, ArrowDown, Activity, Users, ChevronLeft, Grid,FolderOpen,
      Folder, CheckSquare, FileText, AlertCircle, Package, Menu, Search,
      // REGISTER NEW ICONS HERE:
      Bell, LayoutDashboard, Truck, BookOpen, Calendar, Settings, ChevronRight, MoreVertical,
      Mail, MapPin, FileQuestion,PlusCircle,CheckCircle,
      Lock, List, Check, Map, Building, Trash,Hash,CreditCard,ArrowRight,Edit3,CircleCheck,
      Eye, Phone, Plus,ArrowLeft,CircleAlert,
      EyeOff, UserPlus,ChartBar,ChartColumn,
      LogIn, Trash2, Edit, Filter,Columns2,Tag,
      // ADD THESE IF MISSING:
      User, X,
      LogOut,
      Info
    })),

    { provide: LOCALE_ID, useValue: 'ar-SA' }
  ]
};
