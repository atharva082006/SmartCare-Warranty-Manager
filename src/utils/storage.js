/**
 * LocalStorage wrapper with fallback and safe JSON serialization.
 * Centralizes all browser storage interactions for services.
 */

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch (err) {
      console.warn(`[storage] Error reading key "${key}":`, err);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[storage] Error writing key "${key}":`, err);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`[storage] Error removing key "${key}":`, err);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (err) {
      console.error('[storage] Error clearing storage:', err);
      return false;
    }
  },
};
