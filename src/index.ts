// DATABASES

import {Observable, Subject} from 'rxjs';
import {filter} from 'rxjs/operators';

class MemoryDocRef {
  constructor(private id: string) {
  }

  isExists() {
    return false;
  }

  set(data) {
    console.log(`memory doc set data`);
  }

  update(data) {
    console.log(`memory doc update data`);
  }
}

class MemoryCollectionRef {
  constructor(private collectionId: string) {
  }

  doc(docId: string) {
    return new MemoryDocRef(docId);
  }

  query() {
    return new MemoryQueryCollectionRef();
  }
}

class MemoryQueryCollectionRef {
  snapshot() {
    return [];
  }
}

class MemoryDb {
  doc(id: string) {
    return new MemoryDocRef(id);
  }

  collection(collectionId: string) {
    return new MemoryCollectionRef(collectionId);
  }
}

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

class RemoteDb {
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

// QUERY

interface IEqualCondition {
  [field: string]: string | number;
}

interface IQueryOperators {
  [field: string]: {
    [operator: string]: string | number
  }
}

// @ts-ignore
interface IQuery extends IEqualCondition, IQueryOperators {
}

// represent collection query
// single document is special case of collection query
class Query {
  constructor(readonly collectionId: string, readonly query: IQuery) {
  }

  isSingleDoc(): boolean {
    return this.query.hasOwnProperty('_id') && (typeof this.query['_id'] === 'string');
  }

  identification() {
    return JSON.stringify(this.query);
  }
}

// SYNC
interface ISyncOptions {
  // sync despite the fact that query was previously synced
  force?: boolean;
}

class DefaultQuerySyncStrategy {
  constructor(private query: Query, private options: any, private memory: MemoryDb, private remote: RemoteDb) {
  }

  exec() {
    const memoryCollection = this.memory.collection(this.query.collectionId);
    const remoteCollection = this.remote.collection(this.query.collectionId);

    // translate query to remoteQuery
    const remoteQuery = remoteCollection.query(this.query.query);

    return remoteQuery.snapshot().then((remoteDocuments) => {
      remoteDocuments.forEach((remoteDocument) => {
        memoryCollection.doc(remoteDocument.id).update(remoteDocument);
      });
    });
  }
}

class DefaultDocSyncStrategy {
  constructor(private collectionId: string,
              private docId: string,
              private options: any,
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    const memoryDoc = this.memory.collection(this.collectionId).doc(this.docId);

    if (!memoryDoc.isExists()) {
      return Promise.resolve();
    }

    return this.remote.collection(this.collectionId).doc(this.docId).snapshot().then((remoteDoc) => {
      memoryDoc.update(remoteDoc);
    });
  }
}

class SyncServer {
  private previouslySyncedQueries: Set<string> = new Set();
  private syncDocOperations: Map<string, Promise<any>> = new Map();

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
    this.remote.events$.pipe(
      filter((event) => Boolean(event instanceof RemoteCollectionUpdateEvent))
    ).subscribe((event: RemoteCollectionUpdateEvent) => {
      // invalidate all previously synced queries for updated collection id
      // event.collectionId
    });
  }

  syncDoc(collectionId: string, docId: string, options: ISyncOptions = {}) {
    const identification = `${collectionId}-${docId}`;

    // doc was already synced
    if (!options.force && this.previouslySyncedQueries.has(identification)) {
      return Promise.resolve();
    }

    // sync in progress, return promise
    if (this.syncDocOperations.has(identification)) {
      return this.syncDocOperations.get(identification);
    }

    // start syncing
    const sync = new DefaultDocSyncStrategy(
      collectionId,
      docId,
      options,
      this.memory,
      this.remote
    );

    const syncPromise = sync.exec();

    // cache sync operation based on query representation
    // but not on query instance
    this.syncDocOperations.set(identification, syncPromise);

    // clean doc operation after
    syncPromise.finally(() => {
      this.previouslySyncedQueries.add(identification);
      this.syncDocOperations.delete(identification);
    });

    return syncPromise;
  }

  syncQuery(query: Query, options?: ISyncOptions) {
    if (!this.syncDocOperations.has(query.identification())) {
      const sync = new DefaultQuerySyncStrategy(
        query,
        options,
        this.memory,
        this.remote
      );

      const syncPromise = sync.exec();

      // cache sync operation based on query representation
      // but not on query instance
      this.syncDocOperations.set(query.identification(), syncPromise);

      // clean doc operation after
      syncPromise.finally(() => {
        this.syncDocOperations.delete(query.identification());
      });
    }

    return this.syncDocOperations.get(query.identification());
  }
}

// MUTATE

class DefaultSetDocStrategy {
  constructor(private docId: string,
              private newData: any,
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    // Default strategy does not know cache strategies for underlying storage.
    // It runs all in parallel.
    return Promise.all([
      this.memory.doc(this.docId).update(this.newData),
      this.remote.doc(this.docId).update(this.newData)
    ]);
  }
}

class DefaultUpdateDocStrategy {
  constructor(private docId: string,
              private newData: any,
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    // Default strategy does not know cache strategies for underlying storage.
    // It runs all in parallel.
    return Promise.all([
      this.memory.doc(this.docId).update(this.newData),
      this.remote.doc(this.docId).update(this.newData)
    ]);
  }
}

class MutateServer {
  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  setDocData(docId: string, newData) {
    const setDocStrategy = new DefaultSetDocStrategy(docId, newData, this.memory, this.remote);

    return setDocStrategy.exec();
  }

  updateDocData(docId: string, newData) {
    const updateStrategy = new DefaultUpdateDocStrategy(docId, newData, this.memory, this.remote);

    return updateStrategy.exec();
  }
}

// PUBLIC INTERFACE

class DocRef {
  constructor(private collectionId: string,
              private docId: string,
              private syncServer: SyncServer,
              private mutateServer: MutateServer) {
  }

  sync(options?) {
    return this.syncServer.syncDoc(
      this.collectionId,
      this.docId
    );
  }

  // rewrite any previous values
  set(newData) {
    return this.mutateServer.setDocData(this.collectionId, newData);
  }

  // partial update
  update(newData) {
    return this.mutateServer.updateDocData(this.collectionId, newData);
  }
}

class CollectionQueryRef {
  constructor(private collectionId: string, private syncServer: SyncServer) {
  }

  where(key, comparison, value) {
    return this;
  }

  sync(options?: any) {
    // todo: need to implement
    const query = new Query(this.collectionId, {});

    return this.syncServer.syncQuery(query, options);
  }
}

class CollectionRef {
  constructor(private collectionId: string, private syncServer: SyncServer, private mutateServer: MutateServer) {
  }

  doc(docId: string) {
    return new DocRef(this.collectionId, docId, this.syncServer, this.mutateServer);
  }

  query() {
    return new CollectionQueryRef(this.collectionId, this.syncServer);
  }
}

class DatabaseManager {
  private defaultCollectionId = 'DEFAULT_COLLECTION_ID';
  private syncServer = new SyncServer(this.memory, this.remote);
  private mutateServer = new MutateServer(this.memory, this.remote);

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  doc(docId: string) {
    return new DocRef(this.defaultCollectionId, docId, this.syncServer, this.mutateServer);
  }

  collection(id) {
    return new CollectionRef(id, this.syncServer, this.mutateServer);
  }
}

// CLIENT
const memoryDb = new MemoryDb();
const remoteDb = new RemoteDb();
const databaseManager = new DatabaseManager(
  memoryDb,
  remoteDb
);

// use case 1: sync doc from remote to memory dbs
/*databaseManager.doc('admin').sync().then(() => {
  console.log(`synced`);
});*/

// use case 1.1: two identical parallel sync request, one one should be executed
/*const sync1 = databaseManager.doc('admin').sync();
const sync2 = databaseManager.doc('admin').sync();
Promise.all([
  sync1,
  sync2
]).then(() => {
  console.log(`Double synced`);
});*/

// use case 2: sync doc from the collection
/*databaseManager.collection('users').doc('admin').sync().then(() => {
  console.log(`synced`);
});*/

// use case 2.1: should not call remote server for the sync if it's already synced
const initialSync = databaseManager.collection('users').doc('admin').sync();
initialSync.then(() => {
  databaseManager.collection('users').doc('admin').sync().then(() => {
    console.log('synced');
  });
});

// use case 3: sync collection subset
/*databaseManager.collection('users')
  .query().where('parent', '=', null)
  .sync().then(() => {
  console.log(`collection query synced`);
});*/

// use case 4: mutate doc
/*databaseManager.doc('admin').update({}).then(() => {
  console.log(`updated`);
});*/

