import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {IQueryRequest} from '../query';
import {DocSnapshot, QuerySnapshot} from '../snapshot';
import {IRemoteCollectionRef, IRemoteDatabase, IRemoteDocRef, IRemoteQueryCollectionRef} from './interfaces';

PouchDB.plugin(PouchFind);

class RemoteDocRef<IDoc> implements IRemoteDocRef<IDoc> {
  private databaseDocId = `${this.collectionId}:${this.docId}`;

  constructor(private collectionId: string, private docId: string, private provider: any) {
  }

  update(newData: Partial<IDoc>) {
    // todo: provider should care about how to save doc, not remote doc
    return this.getRawDoc().then((rawData) => {

      return this.provider.put({
        ...rawData,
        // todo: fix it
        ...(newData as Object)
      });
    });
  }

  snapshot() {
    return this.getRawDoc().then((rawDoc) => {
      const {id, ...docData} = this.extractDoc(rawDoc);

      return new DocSnapshot(id, docData);
    }, () => {
      // doc does not exist
      return new DocSnapshot(this.docId, undefined);
    });
  }

  /** Create new doc if doesn't exist and set data */
  set(newData: IDoc) {
    return this.isExist().then(() => {
      return this.getRawDoc().then((rawData) => {
        const {_id, type, id, _rev, ...previousData} = rawData;

        // rewrite any previous data
        return this.provider.put({
          _id,
          _rev,
          id,
          type,
          // todo: fix it
          ...(newData as Object)
        });
      });
    }, () => {
      return this.createNew(newData);
    });
  }

  isExist() {
    return this.getRawDoc().then(() => true);
  }

  remove() {
    return this.getRawDoc().then((rawData) => {
      return this.provider.remove(rawData);
    });
  }

  private createNew(newData: any) {
    const data = {
      _id: this.databaseDocId,
      id: this.docId,
      type: this.collectionId,
      ...newData
    };

    return this.provider.create(data);
  }

  private getRawDoc(): Promise<any> {
    return this.provider.get(this.databaseDocId);
  }

  private extractDoc(rawDoc: any) {
    const {_id, _rev, type, ...doc} = rawDoc;

    return doc;
  }
}

class RemoteCollectionRef<IDoc> implements IRemoteCollectionRef<IDoc> {
  constructor(private collectionId: string, private provider: any) {
  }

  doc(docId: string) {
    return new RemoteDocRef<IDoc>(this.collectionId, docId, this.provider);
  }

  query(query: IQueryRequest = {}) {
    return new RemoteQueryCollectionRef(this.collectionId, query, this.provider);
  }
}

class RemoteQueryCollectionRef<IDoc> implements IRemoteQueryCollectionRef<IDoc> {
  constructor(private collectionId: string, private query: IQueryRequest, private provider: any) {
  }

  update() {
    return Promise.resolve();
  }

  snapshot() {
    return this.provider.find({
      selector: {
        ...this.query,
        type: this.collectionId
      }
    }).then((result) => {
      const docs = result.docs.map((rawDoc) => {
        const {_id, _rev, type, id, ...doc} = rawDoc;

        return new DocSnapshot(id, doc);
      });

      return new QuerySnapshot<IDoc>(docs);
    });
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

export class InMemoryRemoteProvider {
  private storage = {};

  create(data: any) {
    return this.put(data);
  }

  put(data: any) {
    this.storage[data._id] = data;

    return Promise.resolve();
  }

  get(id: string) {
    if (!this.storage[id]) {
      return Promise.reject();
    }

    return Promise.resolve(this.storage[id]);
  }

  find(query: any) {
    const docs = Object.values(this.storage).filter((doc: any) => {
      return doc.type === query.selector.type;
    });

    return Promise.resolve({docs});
  }

  remove(data: any) {
    delete this.storage[data._id];

    return Promise.resolve();
  }

  syncWithServer() {
    // memory does not have server
    return Promise.resolve();
  }

  removeAllData() {
    this.storage = {};

    return Promise.resolve();
  }
}

export class PouchDbRemoteProvider {
  private pouch: any;

  private queue: Promise<any> = Promise.resolve();

  private toUpdate = {};

  constructor(private dbName: string, private remoteDatabaseUrl?: string) {
    this.initializePouch();
  }

  put(data: any) {
    // todo: OMG refactor it!
    if (!this.toUpdate[data._id]) {
      const toUpdatePackage = {};

      const subject = (new BehaviorSubject(data)).pipe(
        debounceTime(300)
      );

      toUpdatePackage['subject'] = subject;

      toUpdatePackage['subscription'] = subject.subscribe((latestData: any) => {
        const resolve = this.toUpdate[latestData._id].resolve;
        const reject = this.toUpdate[latestData._id].reject;

        this.toUpdate[latestData._id].subscription.unsubscribe();
        this.toUpdate[latestData._id] = null;

        // todo: I dont think that I need to wait for the previous execution - try to delete it
        this.queue = this.queue.then(() => {
          return this.pouch.get(latestData._id).then((doc: any) => {
            const {_rev, ...newData} = latestData;

            this.pouch.put({
              ...doc,
              ...newData
            }).then(resolve, reject);
          });
        });
      });

      toUpdatePackage['promise'] = new Promise((resolve, reject) => {
        toUpdatePackage['resolve'] = resolve;
        toUpdatePackage['reject'] = reject;
      });

      this.toUpdate[data._id] = toUpdatePackage;
    } else {
      this.toUpdate[data._id].subject.next(data);
    }

    return this.toUpdate[data._id].promise;
  }

  create(data) {
    return this.pouch.put(data);
  }

  get(id: string) {
    return this.pouch.get(id);
  }

  find(query: any) {
    return this.pouch.find(query);
  }

  remove(data: string) {
    return this.pouch.remove(data);
  }

  configure(config) {
    if (config && config.remoteDatabaseUrl) {
      this.remoteDatabaseUrl = config.remoteDatabaseUrl;
    }
  }

  removeAllData() {
    return this.pouch.destroy().then(() => {
      this.initializePouch();
    });
  }

  syncWithServer() {
    const remotePouchDb = new PouchDB(this.remoteDatabaseUrl);

    return new Promise((resolve, reject) => {
      this.pouch.sync(remotePouchDb)
        .on('complete', resolve)
        .on('error', reject);
    });
  }

  initializePouch() {
    this.pouch = new PouchDB(this.dbName, {auto_compaction: true});
  }
}

export class RemoteDb implements IRemoteDatabase {
  events$: Observable<any>;
  private readonly api: RemoteAPI;
  private readonly eventManager: EventManager;

  constructor(private provider: any) {
    this.eventManager = new EventManager();
    this.api = new RemoteAPI(this.eventManager);
    this.events$ = this.eventManager.events$;
  }

  doc(collectionId: string, docId: string) {
    return new RemoteDocRef(collectionId, docId, this.provider);
  }

  collection(collectionId: string) {
    return new RemoteCollectionRef(collectionId, this.provider);
  }

  syncWithServer() {
    return this.provider.syncWithServer();
  }

  removeAllData() {
    // todo: need to implement
    this.provider.removeAllData();
  }
}
