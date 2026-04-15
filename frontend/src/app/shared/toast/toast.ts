import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../core/services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" *ngIf="activeToasts.length > 0">
      <div *ngFor="let toast of activeToasts" 
           class="toast-item" 
           [class.success]="toast.type === 'success'"
           [class.error]="toast.type === 'error'"
           [class.info]="toast.type === 'info'"
           (click)="removeToast(toast)">
        <div class="toast-icon">
          <svg *ngIf="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg *ngIf="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <svg *ngIf="toast.type === 'info'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      min-width: 320px;
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: toastSlideIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .toast-item.success {
      background: rgba(22, 163, 74, 0.95);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .toast-item.error {
      background: rgba(220, 38, 38, 0.95);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .toast-item.info {
      background: rgba(37, 99, 235, 0.95);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toast-message {
      flex-grow: 1;
      line-height: 1.4;
    }

    @keyframes toastSlideIn {
      from { transform: translateX(120%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class Toast implements OnInit, OnDestroy {
  activeToasts: ToastMessage[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private toastService: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.subscription.add(
      this.toastService.toasts$.subscribe(toast => {
        this.activeToasts = [...this.activeToasts, toast];
        this.cdr.detectChanges();
        setTimeout(() => {
          this.removeToast(toast);
          this.cdr.detectChanges();
        }, toast.duration || 3000);
      })
    );
  }

  removeToast(toast: ToastMessage) {
    this.activeToasts = this.activeToasts.filter(t => t !== toast);
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
