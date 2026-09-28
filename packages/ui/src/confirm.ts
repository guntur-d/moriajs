/**
 * @moriajs/ui - Imperative confirmation dialogs
 */

import m from 'mithril';
import { Modal } from './modal.js';

export interface ConfirmationOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger';
}

interface Confirmation extends ConfirmationOptions {
    id: string;
    resolve: (value: boolean) => void;
}

const confirmations: Confirmation[] = [];

const MESSAGE_STYLE: Record<string, string> = {
    marginBottom: '1.5rem',
    color: '#374151',
};

const ACTIONS_STYLE: Record<string, string> = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
};

const BTN_BASE_STYLE: Record<string, string> = {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
};

const CANCEL_BTN_STYLE: Record<string, string> = {
    ...BTN_BASE_STYLE,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
};

const CONFIRM_BG: Record<NonNullable<ConfirmationOptions['type']>, string> = {
    danger: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
};

function confirmBtnStyle(type: ConfirmationOptions['type']): Record<string, string> {
    return {
        ...BTN_BASE_STYLE,
        border: 'none',
        background: CONFIRM_BG[type ?? 'info'],
        color: '#fff',
    };
}

/**
 * Show a confirmation dialog.
 */
export const confirm = (options: string | ConfirmationOptions): Promise<boolean> => {
    const config: ConfirmationOptions = typeof options === 'string' ? { message: options } : options;
    const id = `confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve) => {
        confirmations.push({ ...config, id, resolve });
        m.redraw();
    });
};

/**
 * Dismiss a pending confirmation, resolving its promise with `result`.
 */
export function dismissConfirm(id: string, result: boolean): void {
    const index = confirmations.findIndex((conf) => conf.id === id);
    if (index !== -1) {
        const [conf] = confirmations.splice(index, 1);
        conf.resolve(result);
        m.redraw();
    }
}

/**
 * ConfirmationRegistry component.
 * Mount once in your app layout to handle imperative confirmation calls.
 */
export const ConfirmationRegistry: m.Component = {
    view() {
        return m(
            '.moria-confirmation-registry',
            confirmations.map((c) =>
                m(Modal, {
                    isOpen: true,
                    title: c.title || 'Confirm',
                    onClose: () => dismissConfirm(c.id, false),
                }, [
                    m('p', { style: MESSAGE_STYLE }, c.message),
                    m('.moria-modal-actions', { style: ACTIONS_STYLE }, [
                        m('button', {
                            style: CANCEL_BTN_STYLE,
                            onclick: () => dismissConfirm(c.id, false),
                        }, c.cancelText || 'Cancel'),
                        m('button', {
                            style: confirmBtnStyle(c.type),
                            onclick: () => dismissConfirm(c.id, true),
                        }, c.confirmText || 'Confirm'),
                    ]),
                ])
            )
        );
    },
};
