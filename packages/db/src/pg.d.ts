declare module 'pg' {
    // Minimal ambient declaration for the optional `pg` dependency.
    // Full driver types come from `@types/pg` when installed; this keeps
    // builds working when `pg` is present without its types.
    const Pool: any;
    export { Pool };
    const pg: { Pool: any };
    export default pg;
}
