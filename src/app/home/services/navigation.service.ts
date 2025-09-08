// navigation.service.ts
import { Injectable } from '@angular/core';

type Ctx = 'fs' | 'virtual';
interface Stack { history: string[]; index: number; }

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private stacks: Record<Ctx, Stack> = {
        fs: { history: [], index: -1 },
        virtual: { history: [], index: -1 }
    };

    private ctx: Ctx = 'fs';

    /** Set which stack we’re using (call this in HomeComponent.ngOnInit). */
    setContext(ctx: Ctx) {
        this.ctx = ctx;
    }

    /** Reset one stack (or both if omitted). */
    reset(ctx?: Ctx) {
        if (ctx) {
            this.stacks[ctx] = { history: [], index: -1 };
        } else {
            this.stacks.fs = { history: [], index: -1 };
            this.stacks.virtual = { history: [], index: -1 };
        }
    }

    /** Navigate to a new path in the current context. */
    navigateTo(path: string): void {
        const s = this.stacks[this.ctx];
        if (s.index < s.history.length - 1) {
            s.history.splice(s.index + 1);
        }
        s.history.push(path);
        s.index = s.history.length - 1;
    }

    canGoBack(): boolean {
        const s = this.stacks[this.ctx];
        return s.index > 0;
    }

    canGoForward(): boolean {
        const s = this.stacks[this.ctx];
        return s.index < s.history.length - 1;
    }

    goBack(): string | null {
        const s = this.stacks[this.ctx];
        if (s.index > 0) {
            s.index--;
            return s.history[s.index] ?? null;
        }
        return null;
    }

    goForward(): string | null {
        const s = this.stacks[this.ctx];
        if (s.index < s.history.length - 1) {
            s.index++;
            return s.history[s.index] ?? null;
        }
        return null;
    }

    /** Optional helper if you need it */
    getCurrent(): string | null {
        const s = this.stacks[this.ctx];
        return s.index >= 0 ? s.history[s.index] : null;
    }

    // navigation.service.ts
    getCurrentFor(ctx: 'fs' | 'virtual'): string | null {
        const s = this.stacks[ctx];
        return s.index >= 0 ? s.history[s.index] : null;
    }


}
