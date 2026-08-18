/**
 * Open data-table registry. Later tickets register unit defs, weapons,
 * formations, and economy rows under their own keys without changing this file.
 */
const tables = new Map<string, unknown>();

export function registerData<T>(key: string, value: T): T {
  tables.set(key, value);
  return value;
}

export function getData<T>(key: string): T | undefined {
  return tables.get(key) as T | undefined;
}

export function hasData(key: string): boolean {
  return tables.has(key);
}

export function listDataKeys(): string[] {
  return [...tables.keys()];
}
