/**
 * @moriajs/ui
 *
 * UI component library for Mithril.js.
 * Includes toaster notifications, modals, and layout primitives.
 * CSS-framework agnostic — ships its own minimal styles.
 */

export { toast, showToast, dismissToast, clearToasts, Toaster, TOAST_COLORS } from './toast.js';
export type { Toast, ToastType } from './toast.js';
export { Modal } from './modal.js';
export type { ModalAttrs } from './modal.js';
export { confirm, dismissConfirm, ConfirmationRegistry } from './confirm.js';
export type { ConfirmationOptions } from './confirm.js';

import { Toaster } from './toast.js';
import { Modal } from './modal.js';
import { ConfirmationRegistry } from './confirm.js';
import { toast } from './toast.js';
import { confirm } from './confirm.js';

/**
 * Aggregate of all UI components for easier discovery.
 */
export const MoriaUI = {
    Toaster,
    Modal,
    ConfirmationRegistry,
    toast,
    confirm,
};
