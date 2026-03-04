/**
 * Browser storage utilities
 */

const STORAGE_PREFIX = 'wheelalign_';

/**
 * Save JSON data to localStorage
 */
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, json);
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

/**
 * Load JSON data from localStorage
 */
export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const json = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return json ? (JSON.parse(json) as T) : null;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * Remove item from localStorage
 */
export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
  }
}

/**
 * Clear all wheelalign data from localStorage
 */
export function clearAllStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Export measurements as JSON file
 */
export function exportAsJSON<T>(data: T, filename: string): void {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export JSON:', error);
  }
}

/**
 * Import measurements from JSON file
 */
export async function importFromJSON<T>(file: File): Promise<T | null> {
  try {
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('Failed to import JSON:', error);
    return null;
  }
}
