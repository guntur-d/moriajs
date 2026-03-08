/**
 * Home page — server-rendered Mithril.js component.
 */

import m from 'mithril';
import { Toaster, ConfirmationRegistry, confirm, toast } from '@moriajs/ui';

/** Server-side data loader */
export async function getServerData() {
    // ...
    return {
        title: 'Welcome to MoriaJS',
        features: [
            'File-based routing',
            'SSR + client hydration',
            'Centralized Confirmations',
            'Agnostic Database (Kysely/Pongo)',
            'JWT authentication',
        ],
    };
}

/** Page component */
let count = 0;

export default {
    title: 'MoriaJS App',
    view(vnode: m.Vnode<{ serverData?: { title: string; features: string[] } }>) {
        const data = vnode.attrs?.serverData;
        return m('div', [
            // Global UI Components
            m(Toaster),
            m(ConfirmationRegistry),
            
            m('main', { style: 'max-width:640px;margin:2rem auto;font-family:system-ui;padding:0 1rem' }, [
                m('h1', { style: 'font-size:2.5rem;margin-bottom:0.5rem' }, '🏔️ ' + (data?.title ?? 'MoriaJS')),
                m('p', { style: 'color:#666;font-size:1.1rem' }, 'Your full-stack Mithril.js app is up and running.'),
                
                m('div', { style: 'background:#f4f4f4;padding:1.5rem;border-radius:8px;margin:2rem 0;text-align:center' }, [
                    m('h3', { style: 'margin-top:0' }, 'Hydration & UI Demo'),
                    m('p', 'Click the button below to test the centralized confirmation dialog:'),
                    m('div', { style: 'display:flex;gap:1rem;justify-content:center;align-items:center;margin-top:1rem;' }, [
                        m('button', { 
                            style: 'background:#007bff;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                            onclick: () => { count++; }
                        }, `Count is ${count}`),
                        m('button', { 
                            style: 'background:#dc2626;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer',
                            onclick: async () => { 
                                const confirmed = await confirm({
                                    title: 'Reset Counter?',
                                    message: 'This will reset the counter to zero. Are you sure?',
                                    confirmText: 'Yes, reset it',
                                    type: 'danger'
                                });
                                if (confirmed) {
                                    count = 0;
                                    toast.success('Counter reset successfully');
                                } else {
                                    toast.info('Action cancelled');
                                }
                            }
                        }, 'Reset Counter'),
                    ])
                ]),

                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('h2', { style: 'font-size:1.3rem' }, 'Features'),
                m('ul', { style: 'line-height:1.8' },
                    (data?.features ?? []).map((f: string) => m('li', f))
                ),
                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('h2', { style: 'font-size:1.3rem' }, 'Quick Links'),
                m('ul', { style: 'line-height:1.8;display:flex;gap:1rem;padding:0;list-style:none;flex-wrap:wrap;' }, [
                    m('li', m('a', { href: '/api/hello', target: '_blank' }, 'Hello API')),
                    m('li', m('a', { href: '/api/health', target: '_blank' }, 'Health Check')),
                    m('li', m('a', { href: '/api/users/42', target: '_blank' }, 'User Params')),
                    m('li', m('a', { href: '/api/search?q=moria', target: '_blank' }, 'Search Query')),
                ]),
                m('hr', { style: 'border:none;border-top:1px solid #eee;margin:1.5rem 0' }),
                m('p', { style: 'color:#999;font-size:0.9rem' }, [
                    'Edit ',
                    m('code', 'src/routes/pages/index.ts'),
                    ' to get started.',
                ]),
            ])
        ]);
    },
};
