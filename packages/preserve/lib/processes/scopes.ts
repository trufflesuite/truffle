export type Scope = string[];

const separator = "␟"; // ASCII delimiter: unit separator

export const toKey = (scope: Scope): string => scope.join(separator);

export const fromKey = (key: string): Scope => key.split(separator);
