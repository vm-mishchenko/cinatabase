import {BehaviorSubject, Observable} from 'rxjs';
import {IMemoryDocStore, IRemoteDocRef} from '../interfaces';
import {IMediator} from '../mediator';

/**
 * Document data (for use with `DocumentReference.set()`) consists of fields
 * mapped to values.
 */
export interface IDocData {
  [field: string]: any;
}

export interface IDocSnapshot {
  id: string;

  exists: boolean;

  // returns field's value
  field(fieldName: string): any;

  // return all document data
  toJSON(): any;
}

export interface IDoc {
  id: string;

  deleted$: Observable<boolean>;

  isDeleted(): boolean;

  set(data: any): Promise<any>;

  update(data: any): Promise<any>;

  get(): Promise<IDocSnapshot>;

  onSnapshot(fn: (docSnapshot: IDocSnapshot) => void): void;
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
  exists = true;

  constructor(public id: string, private data: any) {
    if (!this.data) {
      // means that document does not exist on server
      this.exists = false;
    }
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

  private cachedGetRequest: Promise<any> = null;
  private syncPromise: Promise<any> = null;

  private docSnapshot: IDocSnapshot = null;
  private docSnapshot$: Observable<IDocSnapshot> = new BehaviorSubject(this.docSnapshot);

  constructor(
    public id: string,
    private memoryStore: IMemoryDocStore,
    private remoteStore: IRemoteDocRef,
    private eventService: IMediator,
    remoteDocData: any,
  ) {
    if (remoteDocData) {
      this.memoryStore.update(remoteDocData);
    }
  }

  // create new or rewrite previously created doc
  set(data: any = {}) {
    return this.remoteStore.set(data).then(() => {
      this.docSnapshot = new DocSnapshot(this.id, data);
      this.notifySnapshot();
    });
  }

  /**
   * Updates memory and remote store data.
   * Frequent update requests may lead to performance hit for Remote store.
   * Since both Remote and Memory stores are abstract for Doc class
   * responsibility how to handle these challenges belongs to store implementations.
   */
  update(data: any): Promise<any> {
    // load data from remote storage
    return this.initSnapshot().then(() => {
      // remote does not have such document
      if (!this.docSnapshot.exists) {
        return Promise.reject();
      }

      // update remote document
      return this.remoteStore.update(data).then(() => {
        this.docSnapshot = new DocSnapshot(this.id, {
          ...this.docSnapshot.toJSON(),
          ...data,
        });

        this.notifySnapshot();
      });
    });
  }

  /**
   * Returns pre-cached data from the memory store if exists
   * or fetches it from remote if does not.
   */
  get(): Promise<IDocSnapshot> {
    if (this.cachedGetRequest) {
      return this.cachedGetRequest;
    }

    const getRequestPromise = this.docSnapshot ?
      Promise.resolve(this.docSnapshot) :
      this.initSnapshot().then(() => this.docSnapshot);

    this.cachedGetRequest = getRequestPromise.finally(() => {
      this.cachedGetRequest = null;
    });

    return this.cachedGetRequest;
  }

  toString() {
    return `${this.id} document`;
  }

  onSnapshot(fn: (docSnapshot: IDocSnapshot) => void) {
    this.initSnapshot().then(() => {
      this.docSnapshot$.subscribe(fn);
    });
  }

  delete(): Promise<any> {
    // make request to the pouchdb
    (this.deleted$ as BehaviorSubject<boolean>).next(true);
    return Promise.resolve();
  }

  isDeleted(): boolean {
    return (this.deleted$ as BehaviorSubject<boolean>).getValue();
  }

  private notifySnapshot() {
    if (!this.docSnapshot$) {
      this.docSnapshot$ = new BehaviorSubject(this.docSnapshot);
    } else {
      (this.docSnapshot$ as BehaviorSubject<IDocSnapshot>).next(this.docSnapshot);
    }
  }

  private initSnapshot(): Promise<any> {
    if (this.docSnapshot) {
      return Promise.resolve();
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.remoteStore
      .get()
      .then((docData) => {
          // document already exists
          const {_id, ...data} = docData;
          this.docSnapshot = new DocSnapshot(_id, data);
        },
        () => {
          // document is not exists
          this.docSnapshot = new DocSnapshot(this.id, undefined);
        },
      )
      .finally(() => {
        this.notifySnapshot();
        this.syncPromise = null;
      });

    return this.syncPromise;
  }
}
