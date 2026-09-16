// Tests use isolated memory storage; they never touch a user's browser data.
const values = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  get length() { return values.size; }, clear() { values.clear(); },
  getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }, key(index) { return [...values.keys()][index] ?? null; },
} });
