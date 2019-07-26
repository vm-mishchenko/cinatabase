import { Observable, Subscription } from 'rxjs';

// memory interfaces
export interface IMemoryDocStore {
  get(): Promise<any>;

  update(data: any): Promise<any>;

  onSnapshot(): Observable<any>;
}

export interface IMemoryCollectionStore {
  add(data: any): Promise<any>;
}

// remote interfaces
export interface IRemoteDocStore {
  get(): Promise<any>;

  update(data: any): Promise<any>;

  onSnapshot(): Observable<any>;
}

export interface IRemoteCollectionStore {
  add(data: any): Promise<any>;
}

/**
 * Remote and Memory stores should implement the same interface.
 */
export interface IStore {
  doc(name: string): IMemoryDocStore;

  collection(name: string): IMemoryCollectionStore;
}
