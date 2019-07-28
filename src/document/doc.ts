import { BehaviorSubject, Observable } from 'rxjs';
import { IMemoryDocStore, IRemoteDocRef } from '../interfaces';
import { IMediator } from '../mediator';

export interface IDocSnapshot {
  id: string;

  // returns field's value
  field(fieldName: string): any;

  // return all document data
  toJSON(): any;
}

export interface IDoc {
  id: string;

  deleted$: Observable<boolean>;

  isDeleted(): boolean;

  update(data: any): IUpdateDocResult;

  get(): Promise<any>;

  snapshot(): any;

  onSnapshot(): Observable<any>;

  isSynced(): boolean;
}

export interface IUpdateDocResult {
  then(onfulfilled?: () => any | PromiseLike<any>, onrejected?: (reason: any) => PromiseLike<never>): Promise<any>;

  catch(onRejected?: (reason: any) => PromiseLike<never>): Promise<any>;

  finally(onFinally?: () => PromiseLike<never>): Promise<any>;

  remote(): Promise<any>;

  memory(): Promise<any>;
}

/**
 * Makes sure that client is notified
 * about all possible states of update request.
 */
class UpdateDocResult implements IUpdateDocResult {
  constructor(private syncPromise: Promise<[Promise<any>, Promise<any>]>) {
  }

  then(onfulfilled?: () => any | PromiseLike<any>, onrejected?: (reason: any) => PromiseLike<never>): Promise<any> {
    return this.syncPromise.then(onfulfilled, onrejected);
  }

  catch(onRejected?: (reason: any) => PromiseLike<never>): Promise<any> {
    return this.syncPromise.catch(onRejected);
  }

  finally(onFinally?: () => PromiseLike<never>): Promise<any> {
    return this.syncPromise.finally(onFinally);
  }

  remote(): Promise<any> {
    return this.syncPromise.then(([memoryPromise, remotePromise]) => remotePromise);
  }

  memory(): Promise<any> {
    return this.syncPromise.then(([memoryPromise, remotePromise]) => memoryPromise);
  }
}

export class DocSnapshot implements IDocSnapshot {
  constructor(public id: string, private data: any) {
  }

  field(fieldName: string) {
    return this.data[fieldName];
  }

  toJSON() {
    return this.data;
  }
}

/**
 * Abstract for the Client memory and remote stores.
 */
export class Doc implements IDoc {
  deleted$: Observable<boolean> = new BehaviorSubject(false);

  private synced = false;
  private cachedGetRequest: Promise<any> = null;
  private syncPromise: Promise<any> = null;

  constructor(
    public id: string,
    private memoryStore: IMemoryDocStore,
    private remoteStore: IRemoteDocRef,
    private eventService: IMediator,
    remoteDocData: any,
  ) {
    if (remoteDocData) {
      this.memoryStore.update(remoteDocData);
      this.synced = true;
    }
  }

  /**
   * Updates memory and remote store data.
   * Frequent update requests may lead to performance hit for Remote store.
   * Since both Remote and Memory stores are abstract for Doc class
   * responsibility how to handle these challenges belongs to store implementations.
   */
  update(data: any): UpdateDocResult {
    return new UpdateDocResult(
      this.sync().then(() => [
        this.memoryStore.update(data),
        this.remoteStore.update(data),
      ]),
    );
  }

  /**
   * Returns pre-cached data from the memory store if exists
   * or fetches it from remote if does not.
   */
  get(): Promise<any> {
    if (this.cachedGetRequest) {
      return this.cachedGetRequest;
    }

    const getRequestPromise = this.synced ?
      Promise.resolve(this.memoryStore.get()) :
      this.sync().then(() => this.memoryStore.get());

    this.cachedGetRequest = getRequestPromise.finally(() => {
      this.cachedGetRequest = null;
    });

    return this.cachedGetRequest;
  }

  toString() {
    return `${this.id} document`;
  }

  onSnapshot(): Observable<any> {
    return this.memoryStore.onSnapshot();
  }

  snapshot() {
    return this.memoryStore.get();
  }

  delete(): Promise<any> {
    // make request to the pouchdb
    (this.deleted$ as BehaviorSubject<boolean>).next(true);
    return Promise.resolve();
  }

  isDeleted(): boolean {
    return (this.deleted$ as BehaviorSubject<boolean>).getValue();
  }

  isSynced(): boolean {
    return this.synced;
  }

  private sync(): Promise<any> {
    if (this.synced) {
      return Promise.resolve();
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.remoteStore
      .get()
      .then((docData) => {
          return this.memoryStore.update(docData);
        },
        () => {
          // remote store does not have data meaning it is a new doc
          // just skip that error
        },
      )
      .finally(() => {
        this.synced = true;
        this.syncPromise = null;
      });

    return this.syncPromise;
  }
}
