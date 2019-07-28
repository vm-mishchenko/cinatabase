import { Observable } from 'rxjs';

// memory interfaces
/**
 * Represents the storage for storing Document Data.
 * Contains the logic for data storing and streaming.
 */
export interface IMemoryDocStore {
  get(): any;

  update(data: any): any;

  onSnapshot(): Observable<any>;
}

export interface IMemoryCollectionStore {
  add(data: any): Promise<any>;
}

export interface IRemoteDocData extends Object {
  _id: string;
}

// remote interfaces
/**
 * Represents Remote Storage Doc./
 * Abstraction over the remote store for particular document instance.
 */
export interface IRemoteDocRef {
  get(): Promise<IRemoteDocData>;

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

  find(options: any): Promise<IRemoteDocData[]>;
}
