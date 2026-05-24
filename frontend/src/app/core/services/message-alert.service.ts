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

  readonly alerts$ = this.alertsSubject.asObservable();

  show(alert: MessageAlert): void {
    this.alertsSubject.next({
      ...alert,
      duration: alert.duration ?? 5000
    });
  }
}
