import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface MessageAlert {
  username: string;
  message: string;
  profilePhotoUrl?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessageAlertService {
  private alertsSubject = new Subject<MessageAlert>();
  private recentAlertKeys = new Map<string, number>();

  readonly alerts$ = this.alertsSubject.asObservable();

  show(alert: MessageAlert): void {
    const key = this.alertKey(alert);
    const now = Date.now();
    const previous = this.recentAlertKeys.get(key);
    if (previous !== undefined && now - previous < 5000) {
      return;
    }

    this.recentAlertKeys.set(key, now);
    this.pruneRecentAlerts(now);

    this.alertsSubject.next({
      ...alert,
      duration: alert.duration ?? 5000
    });
  }

  private alertKey(alert: MessageAlert): string {
    return [
      alert.username.trim().toLowerCase(),
      alert.message.trim(),
      alert.profilePhotoUrl ?? ''
    ].join('|');
  }

  private pruneRecentAlerts(now: number): void {
    for (const [key, timestamp] of this.recentAlertKeys) {
      if (now - timestamp > 10000) {
        this.recentAlertKeys.delete(key);
      }
    }
  }
}
