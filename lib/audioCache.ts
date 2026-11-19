/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const DB_NAME = 'SynergyIntroCache';
const STORE_NAME = 'audioCache';
const DB_VERSION = 1;

import { VoiceSettings, EmotionSettings } from '../types';

export interface CachedAudio {
  id: string; // Hash of text + voice + style + settings
  blob: Blob;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getCachedAudio = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as CachedAudio | undefined;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return null;
  }
};

export const saveToCache = async (id: string, blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const data: CachedAudio = {
        id,
        blob,
        timestamp: Date.now(),
      };
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
};

export const clearAllAudioCache = async (): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Failed to clear IndexedDB audio cache:', error);
    return false;
  }
};

export const generateCacheKey = async (
  text: string, 
  voice: string, 
  style: string, 
  voiceSettings?: VoiceSettings, 
  emotionSettings?: EmotionSettings
): Promise<string> => {
  const settingsStr = JSON.stringify({ voiceSettings, emotionSettings });
  const input = `v3_smooth|${text}|${voice}|${style}|${settingsStr}`;
  const msgUint8 = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
