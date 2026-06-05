import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type AppLanguage = 'en' | 'tr';

const UI_LANG_KEY = 'app.language';
const METADATA_LANG_KEY = 'app.metadataLanguage';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);

  readonly available: { code: AppLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' }
  ];

  readonly uiLanguage = signal<AppLanguage>('en');
  readonly metadataLanguage = signal<AppLanguage>('en');

  init(): void {
    this.setUiLanguage(this.readStored(UI_LANG_KEY) ?? this.detectBrowserLanguage());
    this.metadataLanguage.set(this.readStored(METADATA_LANG_KEY) ?? this.uiLanguage());
  }

  setUiLanguage(lang: AppLanguage): void {
    this.uiLanguage.set(lang);
    this.transloco.setActiveLang(lang);
    this.store(UI_LANG_KEY, lang);
    document.documentElement.lang = lang;
  }

  setMetadataLanguage(lang: AppLanguage): void {
    this.metadataLanguage.set(lang);
    this.store(METADATA_LANG_KEY, lang);
  }

  private detectBrowserLanguage(): AppLanguage {
    return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  private readStored(key: string): AppLanguage | null {
    const value = localStorage.getItem(key);
    return value === 'en' || value === 'tr' ? value : null;
  }

  private store(key: string, lang: AppLanguage): void {
    localStorage.setItem(key, lang);
  }
}
