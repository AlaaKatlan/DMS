
// src/app/core/directives/permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Permission Directive - إخفاء/إظهار عناصر حسب الصلاحية
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class PermissionDirective implements OnInit {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() appHasPermission: string | string[] = [];

  ngOnInit(): void {
    this.authService.state$.subscribe(state => {
      const hasPermission = this.authService.hasRole(this.appHasPermission);

      this.viewContainer.clear();

      if (hasPermission) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
