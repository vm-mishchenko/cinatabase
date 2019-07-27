import { Observable } from 'rxjs';

// memory interfaces
/**
 * Represents the storage for storing Document Data.
 * Contains the logic for data storing and streaming.
 */
export interface IMemoryDocStore {
  get(): Promise<any>;

  update(data: any): Promise<any>;

  onSnapshot(): Observable<any>;
}

export interface IMemoryCollectionStore {
  add(data: any): Promise<any>;
}

// remote interfaces
/**
 * Represents Remote Storage Doc./
 * Abstraction over the remote store for particular document instance.
 */
export interface IRemoteDocRef {
  get(): Promise<any>;

  update(data: any): Promise<any>;
}

export interface IRemoteCollectionStore {
  add(data: any): Promise<any>;
}

/**
 * Represents Memory Database
 */
export interface IMemoryStore {
  doc(name: string): IMemoryDocStore;
}

/**
 * Represents Remote Database
 */
export interface IRemoteStore {
  doc(name: string): IRemoteDocRef;
}
