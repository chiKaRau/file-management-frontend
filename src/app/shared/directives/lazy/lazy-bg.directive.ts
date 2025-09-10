import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appLazyBg]'
})
export class LazyBgDirective implements OnInit, OnDestroy {
    @Input('appLazyBg') bgUrl: string | '' = '';

    private io?: IntersectionObserver;
    private applied = false;

    constructor(private el: ElementRef<HTMLElement>, private r: Renderer2) { }

    ngOnInit() {
        if (!this.bgUrl) return;

        this.io = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting && !this.applied) {
                    this.r.setStyle(this.el.nativeElement, 'backgroundImage', `url("${this.bgUrl}")`);
                    this.r.setStyle(this.el.nativeElement, 'backgroundSize', 'cover');
                    this.r.setStyle(this.el.nativeElement, 'backgroundPosition', 'center');
                    this.applied = true;
                }
                // Optional: if you want to release memory when far away, you can unset when not intersecting.
                // else if (!entry.isIntersecting && this.applied) {
                //   this.r.removeStyle(this.el.nativeElement, 'backgroundImage');
                //   this.applied = false;
                // }
            }
        }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });

        this.io.observe(this.el.nativeElement);
    }

    ngOnDestroy() {
        this.io?.disconnect();
    }
}
