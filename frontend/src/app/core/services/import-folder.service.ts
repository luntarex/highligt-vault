import { Injectable } from '@angular/core';

export interface SavedImportFolder {
  id: string;
  name: string;
  path: string;
  handle: any;
}

export interface ImportFolderFile {
  file: File;
  relativePath: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImportFolderService {
  private readonly dbName = 'hvault-import-folders';
  private readonly storeName = 'folders';
  private readonly videoExtensions = new Set(['mp4', 'webm', 'mov', 'm4v']);

  isSupported(): boolean {
    return typeof window !== 'undefined'
      && window.isSecureContext
      && 'showDirectoryPicker' in window
      && 'indexedDB' in window;
  }

  supportMessage(): string {
    if (typeof window === 'undefined') {
      return 'Folder import is not available in this browser context.';
    }
    if (!window.isSecureContext) {
      return 'Folder import needs localhost or HTTPS.';
    }
    if (!('showDirectoryPicker' in window)) {
      return 'Saved folder shortcuts are unavailable in this browser session. You can still drag a folder onto Library to import it.';
    }
    if (!('indexedDB' in window)) {
      return 'Folder import needs browser storage permission.';
    }
    return '';
  }

  async listFolders(): Promise<SavedImportFolder[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async addFolder(): Promise<SavedImportFolder | null> {
    if (!this.isSupported()) {
      return null;
    }

    const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
    const folder: SavedImportFolder = {
      id: crypto.randomUUID(),
      name: handle.name,
      path: handle.name,
      handle
    };

    await this.saveFolder(folder);
    return folder;
  }

  async removeFolder(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async collectVideoFiles(): Promise<ImportFolderFile[]> {
    const folders = await this.listFolders();
    const files: ImportFolderFile[] = [];

    for (const folder of folders) {
      if (!(await this.ensureReadPermission(folder.handle))) {
        continue;
      }
      await this.collectFromDirectory(folder.handle, folder.name, files);
    }

    return files;
  }

  private async saveFolder(folder: SavedImportFolder): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureReadPermission(handle: any): Promise<boolean> {
    if (!handle) {
      return false;
    }

    if (!handle.queryPermission || !handle.requestPermission) {
      return true;
    }

    if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
      return true;
    }

    return (await handle.requestPermission({ mode: 'read' })) === 'granted';
  }

  private async collectFromDirectory(handle: any, currentPath: string, files: ImportFolderFile[]): Promise<void> {
    for await (const [name, child] of handle.entries()) {
      const childPath = `${currentPath}/${name}`;
      if (child.kind === 'directory') {
        await this.collectFromDirectory(child, childPath, files);
        continue;
      }

      if (child.kind === 'file' && this.isVideoName(name)) {
        files.push({
          file: await child.getFile(),
          relativePath: childPath
        });
      }
    }
  }

  private isVideoName(name: string): boolean {
    const extension = name.split('.').pop()?.toLowerCase() || '';
    return this.videoExtensions.has(extension);
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
