import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';

type SmartImageStatus = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-smart-image',
  templateUrl: './smart-image.component.html',
  styleUrls: ['./smart-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmartImageComponent implements OnChanges {
  @Input() src = '';
  @Input() fallbackSources: string[] = [];
  @Input() srcSet?: string;
  @Input() sizes?: string;
  @Input() alt = '';
  @Input() isDarkMode = false;

  @Input() width?: number | string;
  @Input() height?: number | string;
  @Input() loading: 'eager' | 'lazy' = 'eager';

  @Input() maxHeight?: string | number;
  @Input() borderRadius: string | number = 6;
  @Input() showRetryButton = true;

  // Important: default to cover for your current Angular list thumbnails.
  @Input() objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' = 'cover';

  status: SmartImageStatus = 'loading';
  currentIndex = 0;
  retryNonce = 0;
  candidates: string[] = [];

  readonly civitaiImageSegment = 'anim=false,width=450,optimized=true';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src']) {
      this.rebuildCandidates();
      this.currentIndex = 0;
      this.retryNonce = 0;
      this.status = this.candidates.length > 0 ? 'loading' : 'error';
    }

    console.log('[SmartImage] rebuild', {
      src: this.src,
      candidates: this.candidates,
      status: this.status
    });

  }

  get activeSrc(): string | null {
    const selected = this.candidates[this.currentIndex] || '';
    if (!selected) return null;

    if (!this.retryNonce) return selected;

    const separator = selected.includes('?') ? '&' : '?';
    return `${selected}${separator}smartImageRetry=${this.retryNonce}`;
  }

  get normalizedSrcSet(): string | undefined {
    return this.rewriteCivitaiSrcSet(this.srcSet);
  }

  get hasNextFallback(): boolean {
    return this.currentIndex < this.candidates.length - 1;
  }

  get hostMinHeight(): string | null {
    return this.maxHeight == null ? null : this.toCssSize(this.maxHeight);
  }

  get imageMaxHeight(): string | null {
    return this.maxHeight == null ? null : this.toCssSize(this.maxHeight);
  }

  get hostBorderRadius(): string {
    return this.toCssSize(this.borderRadius);
  }

  get imageWidth(): string | null {
    return this.width == null ? null : this.toCssSize(this.width);
  }

  get imageHeight(): string | null {
    return this.height == null ? null : this.toCssSize(this.height);
  }

  onLoad(): void {
    console.log('[SmartImage] loaded', this.activeSrc);
    this.status = 'loaded';
  }

  onError(): void {
    console.log('[SmartImage] error', this.activeSrc);
    if (this.hasNextFallback) {
      this.currentIndex += 1;
      this.status = 'loading';
      return;
    }
    this.status = 'error';
  }

  onRetry(): void {
    this.status = 'loading';
    this.retryNonce += 1;
  }

  private rebuildCandidates(): void {
    const seen = new Set<string>();

    this.candidates = [this.src, ...(this.fallbackSources || [])]
      .map(x => this.rewriteCivitaiImageUrl((x || '').trim()))
      .filter(Boolean)
      .filter(url => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
  }

  private rewriteCivitaiImageUrl(value: string): string {
    const url = (value || '').trim();
    if (!url) return '';

    if (!url.includes('image.civitai.com')) {
      return url;
    }

    return url.replace(
      /(https:\/\/image\.civitai\.com\/[^/]+\/[^/]+\/)([^/]+)(\/[^?#]+)(\?[^#]*)?(#.*)?$/i,
      `$1${this.civitaiImageSegment}$3$4$5`
    );
  }

  private rewriteCivitaiSrcSet(value?: string): string | undefined {
    if (!value) return value;

    return value
      .split(',')
      .map(part => {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\S+)(\s+.+)?$/);
        if (!match) return trimmed;

        const urlPart = match[1];
        const descriptor = match[2] || '';
        return `${this.rewriteCivitaiImageUrl(urlPart)}${descriptor}`;
      })
      .join(', ');
  }

  private toCssSize(value: number | string): string {
    return typeof value === 'number' ? `${value}px` : value;
  }
}