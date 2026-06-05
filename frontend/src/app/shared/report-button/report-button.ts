import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportReason, ReportService, ReportTargetType } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';
import { CustomDropdownComponent } from '../custom-dropdown/custom-dropdown';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-report-button',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomDropdownComponent, TranslocoModule],
  templateUrl: './report-button.html',
  styleUrl: './report-button.css'
})
export class ReportButtonComponent {
  @Input() targetType!: ReportTargetType;
  @Input() targetId!: number | string | undefined | null;
  @Input() label = 'Report';
  @Input() compact = false;
  @Input() targetLabel = 'content';

  isOpen = false;
  isSubmitting = false;
  reason: ReportReason = 'SPAM';
  details = '';

  readonly reasonValues: ReportReason[] = [
    'SPAM', 'HARASSMENT', 'HATE', 'VIOLENCE', 'SEXUAL_CONTENT', 'PERSONAL_INFO', 'COPYRIGHT', 'OTHER'
  ];

  constructor(
    private reportService: ReportService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {}

  get reasonOptions(): string[] {
    return this.reasonValues.map(value => this.reasonLabel(value));
  }

  private reasonLabel(value: ReportReason): string {
    return this.transloco.translate('report.reasons.' + value);
  }

  open(event?: Event): void {
    event?.stopPropagation();
    if (!this.normalizedTargetId()) {
      this.toast.error(this.transloco.translate('report.errorIdentify'));
      return;
    }
    this.isOpen = true;
  }

  close(event?: Event): void {
    event?.stopPropagation();
    if (this.isSubmitting) return;
    this.isOpen = false;
    this.details = '';
    this.reason = 'SPAM';
  }

  submit(event?: Event): void {
    event?.stopPropagation();
    const targetId = this.normalizedTargetId();
    if (!this.targetType || !targetId || this.isSubmitting) return;

    this.isSubmitting = true;
    this.reportService.createReport({
      targetType: this.targetType,
      targetId,
      reason: this.reason,
      details: this.details.trim() || undefined
    }).subscribe({
      next: () => {
        this.toast.success(this.transloco.translate('report.success'));
        this.isSubmitting = false;
        this.close();
        this.cdr.detectChanges();
      },
      error: err => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, this.transloco.translate('report.errorSubmit')));
        this.cdr.detectChanges();
      }
    });
  }

  selectedReasonLabel(): string {
    return this.reasonLabel(this.reason);
  }

  onReasonLabelChange(label: string): void {
    const selectedReason = this.reasonValues.find(value => this.reasonLabel(value) === label);
    if (selectedReason) {
      this.reason = selectedReason;
    }
  }

  private normalizedTargetId(): number | null {
    const value = Number(this.targetId);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
}
