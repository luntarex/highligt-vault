import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageAlert, MessageAlertService } from '../../core/services/message-alert.service';

@Component({
  selector: 'app-message-alert',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (activeAlerts.length > 0) {
      <div class="message-alert-stack">
        @for (alert of activeAlerts; track alert.createdAt) {
          <a class="message-alert-card" routerLink="/messages" (click)="removeAlert(alert)">
            <img
              class="message-alert-avatar"
              [src]="alert.profilePhotoUrl || 'assets/icons/default-avatar.png'"
              alt=""
              decoding="async">
            <div class="message-alert-copy">
              <div class="message-alert-topline">
                <span class="message-alert-label">New message</span>
                <span class="message-alert-dot"></span>
              </div>
              <strong>{{ alert.username }}</strong>
              <p>{{ alert.message }}</p>
            </div>
          </a>
        }
      </div>
    }
  `,
  styles: [`
    .message-alert-stack {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .message-alert-card {
      pointer-events: auto;
      width: min(360px, calc(100vw - 32px));
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border-radius: 20px;
      text-decoration: none;
      color: #f8f4ff;
      background:
        radial-gradient(circle at 20% 20%, rgba(164, 91, 255, 0.26), transparent 32%),
        linear-gradient(135deg, rgba(36, 32, 42, 0.96), rgba(20, 18, 24, 0.94));
      border: 1px solid rgba(190, 148, 255, 0.32);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45), 0 0 30px rgba(154, 79, 255, 0.16);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      animation: messageAlertIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .message-alert-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      object-fit: cover;
      flex: 0 0 auto;
      border: 2px solid rgba(180, 119, 255, 0.68);
      box-shadow: 0 0 0 4px rgba(148, 78, 255, 0.14);
    }

    .message-alert-copy {
      min-width: 0;
      flex: 1;
    }

    .message-alert-topline {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 3px;
    }

    .message-alert-label {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #c79cff;
    }

    .message-alert-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #8bffbd;
      box-shadow: 0 0 12px rgba(139, 255, 189, 0.78);
    }

    .message-alert-card strong {
      display: block;
      font-size: 0.98rem;
      line-height: 1.15;
      margin-bottom: 3px;
    }

    .message-alert-card p {
      margin: 0;
      color: rgba(248, 244, 255, 0.76);
      font-size: 0.88rem;
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @keyframes messageAlertIn {
      from {
        opacity: 0;
        transform: translateX(28px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
  `]
})
export class MessageAlertComponent implements OnInit, OnDestroy {
  activeAlerts: Array<MessageAlert & { createdAt: number }> = [];
  private subscription = new Subscription();

  constructor(
    private alertService: MessageAlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.alertService.alerts$.subscribe(alert => {
        const activeAlert = { ...alert, createdAt: Date.now() + Math.random() };
        this.activeAlerts = [activeAlert, ...this.activeAlerts].slice(0, 3);
        this.cdr.detectChanges();

        setTimeout(() => {
          this.removeAlert(activeAlert);
          this.cdr.detectChanges();
        }, alert.duration ?? 5000);
      })
    );
  }

  removeAlert(alert: MessageAlert & { createdAt: number }): void {
    this.activeAlerts = this.activeAlerts.filter(item => item.createdAt !== alert.createdAt);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
