let n = 0;
/** Unique, sortable-enough local id. */
export const newId = (prefix: string) => `${prefix}:${Date.now().toString(36)}${(n++).toString(36)}`;
