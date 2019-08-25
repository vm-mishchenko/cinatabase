import {BehaviorSubject, Observable} from 'rxjs';

class Database {
  private memory = new MemoryDb();
  private remote = new RemoteDb();
  private sync = new SyncService(this.memory, this.remote);

  collection(name: string, options: any = {}): CollectionRef {
    const syncCollectionRef = this.sync.collection(name);

    return new CollectionRef(name, this.memory.collection(name), syncCollectionRef, options);
  }

  setDefaultSyncStrategy(syncStrategyName: string) {
    this.sync.setDefaultSyncStrategy(syncStrategyName);
  }

  registerSyncStrategyFactory(name, factory: any) {
    this.sync.registerSyncStrategyFactory(name, factory);
  }
}

// CLIENT
class CollectionRef {
  constructor(private name: string,
              private memoryCollection: MemoryCollectionRef,
              private syncCollection: SyncCollectionRef,
              private options: any) {
  }

  doc(name: string): DocRef {
    const memoryDocRef = this.memoryCollection.doc(name);
    const syncDocRef = this.syncCollection.doc(name);

    return new DocRef(name, memoryDocRef, syncDocRef);
  }

  sync(syncStrategy?): Promise<any> {
    return this.syncCollection.executeSyncStrategy(syncStrategy || this.options.defaultSyncStrategy);
  }

  // todo: should I sync data before?
  snapshot(options: any = {}): any[] {
    return this.memoryCollection.snapshot();
  }

  onSnapshot() {
    return this.memoryCollection.onSnapshot();
  }
}

class DocRef {
  constructor(private name: string,
              private memoryDocRef: MemoryDocRef,
              private syncDocRef: SyncDocRef) {
  }

  sync(): Promise<any> {
    return Promise.resolve();
  }

  // should I sync data before?
  snapshot(): Promise<any> {
    return this.syncDocRef.executeSyncStrategy().then(() => {
      return this.memoryDocRef.snapshot();
    });
  }
}

// SYNC
class DefaultSyncStrategy {
  constructor(private memoryCollectionRef: MemoryCollectionRef,
              private remoteDb: RemoteDb,
              private preprocessors: any[],
              private options: any) {
  }

  execute(): Promise<any> {
    // step 1
    return this.remoteDb.get(this.options.query)
      .then((results) => {
        // step 2
        this.preprocessors.forEach((preprocessor) => {
          results = preprocessor(results);
        });

        return results;
      })
      .then((results) => {
        // step 3
        return this.memoryCollectionRef.add(results);
      });
  }
}

class DefaultSyncFactory {
  constructor() {
    // any dependency injection
  }

  create(memoryCollectionRef: MemoryCollectionRef,
         remote: RemoteDb,
         preprocessors: any[],
         options: any) {
    return new DefaultSyncStrategy(memoryCollectionRef, remote, preprocessors, options);
  }
}

class SyncDocRef {
  constructor(private name: string) {

  }

  executeSyncStrategy() {
    return Promise.resolve();
  }
}

class SyncCollectionRef {
  // 1. narrows sync scope to Collection, does not allow client to Sync wider scope
  // 2. proxies real sync operations to Sync Service

  constructor(private collectionName: string,
              private memoryCollectionRef: MemoryCollectionRef,
              private syncService: SyncService) {
  }

  doc(name: string) {
    return new SyncDocRef(name);
  }

  executeSyncStrategy(syncStrategy?): Promise<any> {
    return this.syncService.executeSyncStrategy(this.collectionName, syncStrategy);
  }
}

class SyncService {
  // 1. store all sync collection strategies
  // 2. instantiate and execute strategies

  private syncStrategyFactories = new Map();
  private defaultSyncStrategyName = 'basic';

  constructor(private memoryDb: MemoryDb, private remoteDb: RemoteDb) {
    this.syncStrategyFactories.set('basic', new DefaultSyncFactory());
  }

  collection(collectionName: string) {
    const memoryCollectionRef = this.memoryDb.collection(collectionName);

    return new SyncCollectionRef(collectionName, memoryCollectionRef, this);
  }

  executeSyncStrategy(collectionName: string, syncStrategy = this.defaultSyncStrategyName): Promise<any> {
    const memoryCollectionRef = this.memoryDb.collection(collectionName);

    return this.syncStrategyFactories.get(syncStrategy).create(
      memoryCollectionRef,
      this.remoteDb,
      [],
      {}
    ).execute().finally(() => {
      console.log(`Strategy finished`);
    });
  }

  // set default sync strategy
  setDefaultSyncStrategy(syncStrategyName: string) {
    this.defaultSyncStrategyName = syncStrategyName;
  }

  registerSyncStrategyFactory(name, factory: any) {
    this.syncStrategyFactories.set(name, factory);
  }
}

// MEMORY
class MemoryCollectionRef {
  constructor(private data: BehaviorSubject<any[]>) {
  }

  snapshot() {
    return this.data.getValue();
  }

  onSnapshot(): Observable<any[]> {
    return this.data;
  }

  add(doc) {
    const currentValue = this.data.getValue();

    // auto-generate ID
    doc._id = String(Math.random());

    currentValue.push(doc);
    this.data.next(currentValue);
  }

  doc(name: string): MemoryDocRef {
    return new MemoryDocRef(name, this.data);
  }
}

class MemoryDocRef {
  constructor(private id: string,
              private collectionData: BehaviorSubject<any[]>) {
  }

  snapshot() {
    return this.collectionData.getValue().filter((doc) => {
      return doc._id === this.id;
    })[0];
  }
}

class MemoryDb {
  private collections = {};

  add(data: any[]): Promise<any> {
    return Promise.resolve();
  }

  // collection ref to data
  collection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new BehaviorSubject([]);
    }

    return new MemoryCollectionRef(this.collections[name]);
  }
}

class RemoteDb {
  get(options: any): Promise<any> {
    return Promise.resolve();
  }
}

// NOTES
// 1. Let's assume that "Sync" is advanced concept. By default all operation do sync before make changes.

// Sync
// I assume that persistent storage could be changed only through the library interface.
// Thus: once synchronized doc is not needed repeated sync operation.

// On the doc level it's relatively easy to track synced doc, what about collection level?
// Collection query using dynamic options, and cached status could be stored only based on these options.
// Query could represent sync options and thus query could keep track whether it was synced or not?
// Or maybe collection.sync() should return SyncStrategy that keeps track whether it was synced or not?

/*
* There are two source from where I could query data: memory and remote.
*
* Can I automatically return data from memory? No that is principally impossible.
* Imagine that I want to take 20 docs skipping first 100. I could receive same result only when
* stores completely synced. But it could be too expensive operation.
*
* I've to take for granted that stores are synced only fragmentary.
* I should explicitly choose which store I want to query.
* Than why I load docs to the memory?
*
* What is the common workflow with the library?
* 1.  - Sync subset of documents to the memory.
*     - Query memory subset (very efficient operation)
*     - Mutate subset docs.
*
* 2.  - Query remote subset (it would be expensive to sync data in memory and then query it).
*       - pagination as example
*     - Queried data automatically synced to memory.
*
* Which query should be always taken from remote and which could be taken from memory?
* 1. memory - filter based on attributes
* 2. remote - query with skip and limit
* */


// CLIENT
class CustomSyncStrategy {
  constructor(private memoryCollectionRef: MemoryCollectionRef,
              private remoteDb: RemoteDb,
              private preprocessors: any[],
              private options: any) {
    console.log(`Custom Sync Strategy is initialized`);
  }

  execute(): Promise<any> {
    this.memoryCollectionRef.add({custom: 'custom'});

    return Promise.resolve();
  }
}

class CustomSyncFactory {
  constructor() {
    // any dependency injection
  }

  create(memoryCollectionRef: MemoryCollectionRef,
         remote: RemoteDb,
         preprocessors: any[],
         options: any) {
    return new CustomSyncStrategy(memoryCollectionRef, remote, preprocessors, options);
  }
}

const db = new Database();
db.registerSyncStrategyFactory('custom', new CustomSyncFactory());
// db.setDefaultSyncStrategy('custom');

const relationColRef = db.collection('doc-relation', {
  defaultSyncStrategy: 'custom'
});

// sync root to memory
relationColRef.sync('root-component').then(() => {
  // read root from memory
  const rootRelationDocs = relationColRef.snapshot({source: 'memory'});
});

// two identical request to remote, which is sucks
relationColRef.snapshot({onlyRoot: true}).then(() => {
});

relationColRef.snapshot({onlyRoot: true}).then((rootRelationDocs) => {
});

// one request to remote
const relationRootQuery = relationColRef.query('onlyRoot');
relationRootQuery.snapshot();
relationRootQuery.snapshot();

