/**
 * @moriajs/ui
 *
 * UI component library for Mithril.js.
 * Includes toaster notifications, modals, and layout primitives.
 * CSS-framework agnostic — ships its own minimal styles.
 */

import m from 'mithril';

// ─── Toaster ────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

/** Internal toast state */
const toasts: Toast[] = [];

/**
 * Show a toast notification.
 *
 * @example
 * ```ts
 * import { toast } from '@moriajs/ui';
 *
 * toast.success('Saved successfully!');
 * toast.error('Something went wrong');
 * toast.info('New update available');
 * ```
 */
export const toast = {
    show(message: string, type: ToastType = 'info', duration = 3000) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        toasts.push({ id, message, type, duration });
        m.redraw();

        if (duration > 0) {
            setTimeout(() => {
                const index = toasts.findIndex((t) => t.id === id);
                if (index !== -1) {
                    toasts.splice(index, 1);
                    m.redraw();
                }
            }, duration);
        }

        return id;
    },
    success(message: string, duration?: number) {
        return this.show(message, 'success', duration);
    },
    error(message: string, duration?: number) {
        return this.show(message, 'error', duration);
    },
    warning(message: string, duration?: number) {
        return this.show(message, 'warning', duration);
    },
    info(message: string, duration?: number) {
        return this.show(message, 'info', duration);
    },
    dismiss(id: string) {
        const index = toasts.findIndex((t) => t.id === id);
        if (index !== -1) {
            toasts.splice(index, 1);
            m.redraw();
        }
    },
    clear() {
        toasts.length = 0;
        m.redraw();
    },
};

const TOAST_COLORS: Record<ToastType, string> = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
};

/**
 * Toaster container component.
 * Mount once in your app layout.
 *
 * @example
 * ```ts
 * import { Toaster } from '@moriajs/ui';
 * m(Toaster); // Place in your root layout
 * ```
 */
export const Toaster: m.Component = {
    view() {
        return m(
            '.moria-toaster',
            {
                style: {
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    zIndex: '9999',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                },
            },
            toasts.map((t) =>
                m(
                    '.moria-toast',
                    {
                        key: t.id,
                        'data-type': t.type,
                        style: {
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            color: '#fff',
                            fontSize: '0.875rem',
                            minWidth: '250px',
                            cursor: 'pointer',
                            background: TOAST_COLORS[t.type],
                        },
                        onclick: () => toast.dismiss(t.id),
                    },
                    t.message
                )
            )
        );
    },
};

// ─── Modal ──────────────────────────────────────────

export interface ModalAttrs {
    /** Whether the modal is visible */
    isOpen: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Modal title */
    title?: string;
}

/**
 * Modal dialog component.
 *
 * @example
 * ```ts
 * import { Modal } from '@moriajs/ui';
 *
 * let showModal = false;
 *
 * m(Modal, {
 *   isOpen: showModal,
 *   onClose: () => { showModal = false; },
 *   title: 'Confirm Action',
 * }, [
 *   m('p', 'Are you sure?'),
 *   m('button', { onclick: () => { showModal = false; } }, 'Yes'),
 * ]);
 * ```
 */
export const Modal: m.Component<ModalAttrs> = {
    view(vnode) {
        if (!vnode.attrs.isOpen) return m('div', { style: { display: 'none' } });

        return m(
            '.moria-modal-overlay',
            {
                style: {
                    position: 'fixed',
                    inset: '0',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: '9998',
                },
                onclick: (e: MouseEvent) => {
                    if (e.target === e.currentTarget) vnode.attrs.onClose();
                },
            },
            m(
                '.moria-modal',
                {
                    style: {
                        background: '#fff',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        minWidth: '400px',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    },
                },
                [
                    vnode.attrs.title
                        ? m(
                            '.moria-modal-header',
                            {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                },
                            },
                            [
                                m('h2', { style: { margin: '0', fontSize: '1.25rem', fontWeight: '600' } }, vnode.attrs.title),
                                m(
                                    'button',
                                    {
                                        style: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' },
                                        onclick: vnode.attrs.onClose,
                                    },
                                    '×'
                                ),
                            ]
                        )
                        : m('span'),
                    m('.moria-modal-body', vnode.children as m.Children),
                ]
            )
        );
    },
};
