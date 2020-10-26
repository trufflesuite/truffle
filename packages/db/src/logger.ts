import debugModule from "debug";
const debug = debugModule("db:logger"); // this could maybe dogfood

export const logger = (namespace: string) => debugModule(namespace);
