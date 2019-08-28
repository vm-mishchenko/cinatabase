import {Observable, Subject} from 'rxjs';
import {IQuery} from '../manager/query';

class RemoteDocRef {
  constructor(private id: string) {
  }

  update(newData: any) {
    return Promise.resolve();
  }

  snapshot() {
    return Promise.resolve();
  }
}

class RemoteCollectionRef {
  constructor(private collectionId: string, private remoteAPI: RemoteAPI) {
  }

  doc(docId: string) {
    return new RemoteDocRef(docId);
  }

  query(query: IQuery = {}) {
    return new RemoteQueryCollectionRef(this.collectionId, query, this.remoteAPI);
  }
}

class RemoteCollectionUpdateEvent {
  constructor(readonly collectionId: string) {
  }
}

class RemoteQueryCollectionRef {
  constructor(private collectionId: string, private query: IQuery, private remoteAPI: RemoteAPI) {
  }

  update() {
    this.remoteAPI.notify(new RemoteCollectionUpdateEvent(this.collectionId));
  }

  snapshot() {
    return Promise.resolve([]);
  }
}

class RemoteAPI {
  constructor(private eventManager: EventManager) {
  }

  notify(event) {
    this.eventManager.notify(event);
  }
}

class EventManager {
  events$: Observable<any> = new Subject();

  notify(event: any) {
    (this.events$ as Subject<any>).next(event);
  }
}

export class RemoteDb {
  events$: Observable<any>;
  private readonly api: RemoteAPI;
  private readonly eventManager: EventManager;

  constructor() {
    this.eventManager = new EventManager();
    this.api = new RemoteAPI(this.eventManager);
    this.events$ = this.eventManager.events$;
  }

  doc(id: string) {
    return new RemoteDocRef(id);
  }

  collection(collectionId: string) {
    return new RemoteCollectionRef(collectionId, this.api);
  }
}
