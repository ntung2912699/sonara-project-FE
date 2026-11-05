const DATABASE_NAME = 'sonora-karaoke-drafts';
const STORE_NAME = 'drafts';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Local draft storage is not available in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local draft storage.'));
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to update local draft storage.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Unable to update local draft storage.'));
    };
  });
}

export const saveKaraokeDraft = (draft) => withStore('readwrite', (store) => store.put(draft));
export const readKaraokeDrafts = () => withStore('readonly', (store) => store.getAll());
export const deleteKaraokeDraft = (id) => withStore('readwrite', (store) => store.delete(id));
