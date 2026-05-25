// src/utils/storage.js
// Centralized storage utility to handle localStorage operations
// This allows easy switching between localStorage, sessionStorage, or other storage solutions

const STORAGE_TYPE = import.meta.env.VITE_STORAGE_TYPE || 'localStorage';

// Get the appropriate storage object
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  
  switch (STORAGE_TYPE) {
    case 'sessionStorage':
      return window.sessionStorage;
    case 'localStorage':
    default:
      return window.localStorage;
  }
};

export const storage = {
  getItem: (key) => {
    try {
      const store = getStorage();
      return store ? store.getItem(key) : null;
    } catch (error) {
      console.error(`Error getting item ${key} from storage:`, error);
      return null;
    }
  },

  setItem: (key, value) => {
    try {
      const store = getStorage();
      if (store) {
        store.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error setting item ${key} in storage:`, error);
    }
  },

  removeItem: (key) => {
    try {
      const store = getStorage();
      if (store) {
        store.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing item ${key} from storage:`, error);
    }
  },

  clear: () => {
    try {
      const store = getStorage();
      if (store) {
        store.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Export all CounseLink data as JSON
  exportData: () => {
    try {
      const store = getStorage();
      if (!store) return null;

      const data = {
        users: store.getItem('users'),
        currentUser: store.getItem('currentUser'),
        appointments: store.getItem('appointments'),
        messages: store.getItem('messages'),
        conversations: store.getItem('conversations'),
        notifications: store.getItem('notifications'),
        tests: store.getItem('tests'),
        testResults: store.getItem('testResults'),
        exportedAt: new Date().toISOString(),
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      };

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  },

  // Import data from JSON
  importData: (data) => {
    try {
      const store = getStorage();
      if (!store || !data) return { success: false, message: 'Invalid data or storage not available' };

      // Import each data type
      const keys = ['users', 'appointments', 'messages', 'conversations', 'notifications', 'tests', 'testResults'];
      
      keys.forEach(key => {
        if (data[key]) {
          store.setItem(key, data[key]);
        }
      });

      // Don't import currentUser - let the user log in again
      // This prevents session conflicts

      return { success: true, message: 'Data imported successfully. Please log in again.' };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, message: 'Failed to import data: ' + error.message };
    }
  },

  // Download data as JSON file
  downloadDataAsFile: () => {
    try {
      const data = storage.exportData();
      if (!data) {
        throw new Error('Failed to export data');
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `counselink-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, message: 'Data downloaded successfully' };
    } catch (error) {
      console.error('Error downloading data:', error);
      return { success: false, message: 'Failed to download data: ' + error.message };
    }
  },

  // Upload data from JSON file
  uploadDataFromFile: (file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            const result = storage.importData(data);
            resolve(result);
          } catch (error) {
            reject({ success: false, message: 'Invalid JSON file: ' + error.message });
          }
        };

        reader.onerror = () => {
          reject({ success: false, message: 'Failed to read file' });
        };

        reader.readAsText(file);
      } catch (error) {
        reject({ success: false, message: 'Error processing file: ' + error.message });
      }
    });
  },
};

export default storage;
