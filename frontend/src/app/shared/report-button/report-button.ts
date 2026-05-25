import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportReason, ReportService, ReportTargetType } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';
import { CustomDropdownComponent } from '../custom-dropdown/custom-dropdown';

@Component({
  selector: 'app-report-button',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomDropdownComponent],
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

  readonly reasons: Array<{ value: ReportReason; label: string }> = [
    { value: 'SPAM', label: 'Spam or scam' },
    { value: 'HARASSMENT', label: 'Harassment or bullying' },
    { value: 'HATE', label: 'Hate speech' },
    { value: 'VIOLENCE', label: 'Graphic violence' },
    { value: 'SEXUAL_CONTENT', label: 'Sexual content' },
    { value: 'PERSONAL_INFO', label: 'Personal information' },
    { value: 'COPYRIGHT', label: 'Copyright issue' },
    { value: 'OTHER', label: 'Other' }
  ];
  readonly reasonOptions = this.reasons.map(reason => reason.label);

  constructor(
    private reportService: ReportService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  open(event?: Event): void {
    event?.stopPropagation();
    if (!this.normalizedTargetId()) {
      this.toast.error('Could not identify what to report.');
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
        this.toast.success('Report submitted. Thanks for helping keep Vibe Vault safe.');
        this.isSubmitting = false;
        this.close();
        this.cdr.detectChanges();
      },
      error: err => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not submit report.'));
        this.cdr.detectChanges();
      }
    });
  }

  selectedReasonLabel(): string {
    return this.reasons.find(option => option.value === this.reason)?.label || 'Select a reason';
  }

  onReasonLabelChange(label: string): void {
    const selectedReason = this.reasons.find(option => option.label === label);
    if (selectedReason) {
      this.reason = selectedReason.value;
    }
  }

  private normalizedTargetId(): number | null {
    const value = Number(this.targetId);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
}
