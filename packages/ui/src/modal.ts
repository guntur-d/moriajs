/**
 * @moriajs/ui - Modal dialog component
 */

import m from 'mithril';

export interface ModalAttrs {
    /** Whether the modal is visible */
    isOpen: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Modal title */
    title?: string;
}

const OVERLAY_STYLE: Record<string, string> = {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '9998',
};

const DIALOG_STYLE: Record<string, string> = {
    background: '#fff',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    minWidth: '400px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
};

const HEADER_STYLE: Record<string, string> = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
};

const CLOSE_BUTTON_STYLE: Record<string, string> = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
};

/**
 * Modal dialog component.
 */
export const Modal: m.Component<ModalAttrs> = {
    view(vnode) {
        if (!vnode.attrs.isOpen) return null;

        return m(
            '.moria-modal-overlay',
            {
                style: OVERLAY_STYLE,
                onclick: (e: MouseEvent) => {
                    if (e.target === e.currentTarget) vnode.attrs.onClose();
                },
            },
            m(
                '.moria-modal',
                { style: DIALOG_STYLE },
                [
                    vnode.attrs.title
                        ? m('.moria-modal-header', { style: HEADER_STYLE }, [
                            m('h2', { style: { margin: '0', fontSize: '1.25rem', fontWeight: '600' } }, vnode.attrs.title),
                            m('button', { style: CLOSE_BUTTON_STYLE, onclick: vnode.attrs.onClose }, '×'),
                        ])
                        : null,
                    m('.moria-modal-body', vnode.children as m.Children),
                ]
            )
        );
    },
};
