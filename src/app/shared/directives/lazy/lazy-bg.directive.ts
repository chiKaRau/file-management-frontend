import { Directive, ElementRef, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, Renderer2 } from '@angular/core';

@Directive({ selector: '[appLazyBg]' })
export class LazyBgDirective implements OnInit, OnDestroy, OnChanges {
    @Input('appLazyBg') bgUrl: string = '';

    private io?: IntersectionObserver;
    private applied = false;

    constructor(private el: ElementRef<HTMLElement>, private r: Renderer2) { }

    ngOnInit() {
        // Always set up the observer (even if bgUrl is empty at first)
        this.io = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting && !this.applied && this.bgUrl) {
                    this.applyBg();
                }
            }
        }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });

        this.io.observe(this.el.nativeElement);
    }

    ngOnChanges(changes: SimpleChanges) {
        // If URL shows up later (after scanning) and card is already in/near view, apply now
        if (changes['bgUrl'] && this.bgUrl && !this.applied) {
            const rect = this.el.nativeElement.getBoundingClientRect();
            const inView = rect.top < (window.innerHeight + 200) && rect.bottom > -200; // match rootMargin
            if (inView) this.applyBg();
        }
        // If you ever change URLs after applied, re-apply
        if (changes['bgUrl'] && this.bgUrl && this.applied) this.applyBg();
    }

    private applyBg() {
        this.r.setStyle(this.el.nativeElement, 'backgroundImage', `url("${this.bgUrl}")`);
        this.r.setStyle(this.el.nativeElement, 'backgroundSize', 'cover');
        this.r.setStyle(this.el.nativeElement, 'backgroundPosition', 'center');
        this.applied = true;
    }

    ngOnDestroy() { this.io?.disconnect(); }
}
