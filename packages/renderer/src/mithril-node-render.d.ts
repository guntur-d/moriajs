declare module 'mithril-node-render' {
    import type m from 'mithril';
    export default function render(vnode: m.Vnode | m.Component | unknown): Promise<string>;
}
