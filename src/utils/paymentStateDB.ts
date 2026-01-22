// Database helper for storing large payment state
// This file contains ONLY TypeScript functions - NO JSX/React components

const DB_NAME = 'PaymentStateDB';
const STORE_NAME = 'payment_state';
const DB_VERSION = 1;

// Open or create the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Save state before payment (handles large data)
export const savePaymentState = async (state: any): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(state, 'current_payment_state');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('💾 Payment state saved to IndexedDB');
  } catch (error) {
    console.error('❌ Error saving payment state:', error);
    throw error;
  }
};

// Get state after payment returns
export const getPaymentState = async (): Promise<any | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get('current_payment_state');
      request.onsuccess = () => {
        console.log('📥 Payment state retrieved from IndexedDB');
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error getting payment state:', error);
    return null;
  }
};

// Clear state after successful restore
export const clearPaymentState = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete('current_payment_state');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('🗑️ Payment state cleared from IndexedDB');
  } catch (error) {
    console.error('❌ Error clearing payment state:', error);
  }
};