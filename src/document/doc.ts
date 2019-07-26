import { Observable } from 'rxjs';
import { IMemoryDocStore, IRemoteDocStore } from '../interfaces';
import { IMediator } from '../mediator';

export interface IDoc {
  update(data: any): IDocUpdateResult;

  get(): Promise<any>;

  onSnapshot(): Observable<any>;
}

export interface IDocUpdateResult {
  memory: Promise<any>;

  remote: Promise<any>;

  result: Promise<any>;
}

/**
 * Makes sure that client is notified
 * about all possible states of update request.
 */
class DocUpdateResult implements IDocUpdateResult {
  remote: Promise<any> = this.remotePromise;
  memory: Promise<any> = this.memoryPromise;
  result: Promise<any> = Promise.all([this.remotePromise, this.memoryPromise]);

  constructor(private memoryPromise: Promise<any>, private remotePromise: Promise<any>) {}
}

/**
 * Abstract for the Client memory and remote stores.
 */
export class Doc implements IDoc {
  private isSyncedWithRemote = false;
  private cachedGetRequest: Promise<any> = null;

  constructor(
    private name: string,
    private memoryStore: IMemoryDocStore,
    private remoteStore: IRemoteDocStore,
    private eventService: IMediator,
  ) {}

  /**
   * Updates memory and remote store data.
   * Frequent update requests may lead to performance hit for Remote store.
   * Since both Remote and Memory stores are abstract for Doc class
   * responsibility how to handle these challenges belongs to store implementations.
   */
  update(data: any): IDocUpdateResult {
    return new DocUpdateResult(this.memoryStore.update(data), this.remoteStore.update(data));
  }

  /**
   * Returns pre-cached data from the memory store if exists
   * or fetches it from remote if does not.
   */
  get(): Promise<any> {
    if (this.cachedGetRequest) {
      return this.cachedGetRequest;
    }

    let getRequestPromise;

    if (this.isSyncedWithRemote) {
      getRequestPromise = this.memoryStore.get();
    } else {
      getRequestPromise = this.remoteStore
        .get()
        .then(
          docData => {
            return this.memoryStore.update(docData).then(() => docData);
          },
          () => {
            return this.memoryStore.get();
          },
        )
        .finally(() => {
          this.isSyncedWithRemote = true;
        });
    }

    this.cachedGetRequest = getRequestPromise.finally(() => {
      this.cachedGetRequest = null;
    });

    return this.cachedGetRequest;
  }

  toString() {
    return `${this.name} document`;
  }

  onSnapshot(): Observable<any> {
    return this.memoryStore.onSnapshot();
  }
}
