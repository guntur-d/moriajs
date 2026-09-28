/**
 * @moriajs/ui - Toast notifications
 *
 * Imperative toast store + Toaster container component.
 */

import m from 'mithril';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

/** Internal toast state (module-singleton; instantiate per-app if SSR isolation is needed). */
const toasts: Toast[] = [];

function removeToast(id: string): boolean {
    const index = toasts.findIndex((t) => t.id === id);
    if (index !== -1) {
        toasts.splice(index, 1);
        return true;
    }
    return false;
}

function createToastId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Show a toast notification.
 *
 * Standalone function (no `this`) so destructured helpers keep working:
 * `const { success } = toast; success('hi')`.
 */
export function showToast(message: string, type: ToastType = 'info', duration = 3000): string {
    const id = createToastId('toast');
    toasts.push({ id, message, type, duration });
    m.redraw();

    if (duration > 0) {
        setTimeout(() => {
            if (removeToast(id)) {
                m.redraw();
            }
        }, duration);
    }

    return id;
}

export function dismissToast(id: string): void {
    if (removeToast(id)) {
        m.redraw();
    }
}

export function clearToasts(): void {
    toasts.length = 0;
    m.redraw();
}

/**
 * Toast API (back-compat object; all methods are bound closures, not `this`-dependent).
 */
export const toast = {
    show: showToast,
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
    dismiss: dismissToast,
    clear: clearToasts,
};

export const TOAST_COLORS: Record<ToastType, string> = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
};

export const TOASTER_CONTAINER_STYLE: Record<string, string> = {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
};

export function toastItemStyle(type: ToastType): Record<string, string> {
    return {
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        color: '#fff',
        fontSize: '0.875rem',
        minWidth: '250px',
        cursor: 'pointer',
        background: TOAST_COLORS[type],
    };
}

/**
 * Toaster container component. Mount once in your app layout.
 */
export const Toaster: m.Component = {
    view() {
        return m(
            '.moria-toaster',
            { style: TOASTER_CONTAINER_STYLE },
            toasts.map((t) =>
                m(
                    '.moria-toast',
                    {
                        key: t.id,
                        'data-type': t.type,
                        style: toastItemStyle(t.type),
                        onclick: () => dismissToast(t.id),
                    },
                    t.message
                )
            )
        );
    },
};
