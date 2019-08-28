// DATABASES
import {Observable, Subject} from 'rxjs';

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

interface IQueryEqualCondition {
  [field: string]: string | number;
}

interface IQueryOperators {
  [field: string]: {
    [operator: string]: string | number
  }
}

// @ts-ignore
interface IQuery extends IQueryEqualCondition, IQueryOperators {
}

// SYNC
interface ISyncOptions {
  // sync despite the fact that query was previously synced
  force?: boolean;
}

interface ISyncStrategy {
  exec(): Promise<any>;
}

class DefaultQuerySyncStrategy implements ISyncStrategy {
  constructor(private collectionQuery: CollectionQuery,
              private options: any,
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    const memoryCollection = this.memory.collection(this.collectionQuery.collectionId);
    const remoteCollection = this.remote.collection(this.collectionQuery.collectionId);

    // translate query to remoteQuery
    const remoteQuery = remoteCollection.query(this.collectionQuery.query);

    return remoteQuery.snapshot().then((remoteDocuments) => {
      remoteDocuments.forEach((remoteDocument) => {
        memoryCollection.doc(remoteDocument.id).update(remoteDocument);
      });
    });
  }
}

class DefaultDocSyncStrategy implements ISyncStrategy {
  constructor(private docQuery: DocQuery,
              private options: any,
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    const memoryDoc = this.memory.collection(this.docQuery.collectionId).doc(this.docQuery.docId);

    if (!memoryDoc.isExists()) {
      return Promise.resolve();
    }

    return this.remote.collection(this.docQuery.collectionId).doc(this.docQuery.docId).snapshot().then((remoteDoc) => {
      memoryDoc.update(remoteDoc);
    });
  }
}

interface ITrackableQuery {
  collectionId: string;
  identificator: string;
}

class DocQuery implements ITrackableQuery {
  identificator = `${this.collectionId}/${this.docId}`;

  constructor(readonly collectionId: string, readonly docId: string) {
  }
}

// represent collection query
// single document is special case of collection query
class CollectionQuery implements ITrackableQuery {
  identificator = JSON.stringify(this.query);

  constructor(readonly collectionId: string, readonly query: IQuery) {
  }
}

class SyncServer {
  private previouslySyncedQueries: Map<string, ITrackableQuery> = new Map();
  private syncInProgress: Map<string, Promise<any>> = new Map();

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  syncDoc(docQuery: DocQuery, options: ISyncOptions = {}) {
    const syncStrategy = new DefaultDocSyncStrategy(
      docQuery,
      options,
      this.memory,
      this.remote
    );

    return this.sync(syncStrategy, docQuery, options);
  }

  syncQuery(collectionQuery: CollectionQuery, options?: ISyncOptions) {
    const syncStrategy = new DefaultQuerySyncStrategy(
      collectionQuery,
      options,
      this.memory,
      this.remote
    );

    return this.sync(syncStrategy, collectionQuery, options);
  }

  private sync(strategy: ISyncStrategy, trackableQuery: ITrackableQuery, options: ISyncOptions) {
    // query was already synced
    if (!options.force && this.previouslySyncedQueries.has(trackableQuery.identificator)) {
      return Promise.resolve();
    }

    // sync in progress, return promise
    if (this.syncInProgress.has(trackableQuery.identificator)) {
      return this.syncInProgress.get(trackableQuery.identificator);
    }

    console.log(`start syncing`);

    // start syncing
    const syncPromise = strategy.exec();

    // cache sync operation based on query representation
    // but not on query instance
    this.syncInProgress.set(trackableQuery.identificator, syncPromise);

    // clean doc operation after
    syncPromise.finally(() => {
      this.previouslySyncedQueries.set(trackableQuery.identificator, trackableQuery);
      this.syncInProgress.delete(trackableQuery.identificator);
    });

    return syncPromise;
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
    const docQuery = new DocQuery(this.collectionId, this.docId);

    return this.syncServer.syncDoc(docQuery, options);
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
    const query = new CollectionQuery(this.collectionId, {});

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
databaseManager.doc('admin').sync().then(() => {
  console.log(`synced`);
});

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
/*const initialSync = databaseManager.collection('users').doc('admin').sync();
initialSync.then(() => {
  databaseManager.collection('users').doc('admin').sync().then(() => {
    console.log('synced');
  });
});*/

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

