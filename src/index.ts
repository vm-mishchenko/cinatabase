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

class MemoryDb {
  doc(id: string) {
    return new MemoryDocRef(id);
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

class RemoteDb {
  doc(id: string) {
    return new RemoteDocRef(id);
  }
}

class DefaultSyncDocStrategy {
  constructor(private id: string, private options: any, private memory: MemoryDb, private remote: RemoteDb) {
  }

  exec() {
    console.log(`DefaultSyncDocStrategy exec`);

    const memoryDoc = this.memory.doc(this.id);

    if (memoryDoc.isExists()) {
      return Promise.resolve();
    }

    return this.remote.doc(this.id).snapshot().then((remoteSnapshot) => {
      memoryDoc.set(remoteSnapshot);
    });
  }
}

class DefaultSyncQueryStrategy {
  constructor(private collectionId: string, private query: any, private memory: MemoryDb, private remote: RemoteDb) {
  }

  passParamToMe() {
    return this;
  }

  exec() {
    return Promise.resolve();
  }
}

class SyncServer {
  private syncDocOperations: Map<string, Promise<any>> = new Map();
  private syncOperations = [];

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  syncDoc(docId: string, options?: any) {
    // cache sync operation while it's in progress
    if (!this.syncDocOperations.has(docId)) {
      const sync = new DefaultSyncDocStrategy(
        docId,
        options,
        this.memory,
        this.remote
      );

      this.syncDocOperations.set(docId, sync.exec());
    }

    return this.syncDocOperations.get(docId);
  }

  syncQuery(id: string, query: any) {
    const sync = new DefaultSyncQueryStrategy(
      id,
      query,
      this.memory,
      this.remote
    );

    this.syncOperations.push(sync);

    return sync;
  }
}

class DefaultUpdateDocStrategy {
  constructor(private docId: string,
              private newData: any,
              private options: DefaultUpdateStrategyOptions,
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

interface IMutateOptions {
  strategy: string;
  options?: any;
}

interface IMutateStrategy {
  exec(): Promise<any>;
}

interface IMutateStrategyFactory {
  createUpdateDocStrategy(
    docId: string,
    newData: any,
    options: IMutateOptions,
    memory: MemoryDb,
    remote: RemoteDb
  ): IMutateStrategy;
}

class DefaultSetStrategyOptions implements IMutateOptions {
  strategy = 'default';

  constructor(public onlyMemory: boolean = false) {
  }
}

class DefaultUpdateStrategyOptions implements IMutateOptions {
  strategy = 'default';

  constructor(public onlyMemory: boolean = false) {
  }
}

class DefaultMutateStrategyFactory implements IMutateStrategyFactory {
  createUpdateDocStrategy(
    docId: string,
    newData: any,
    options: DefaultUpdateStrategyOptions,
    memory: MemoryDb,
    remote: RemoteDb) {
    return new DefaultUpdateDocStrategy(docId, newData, options, memory, remote);
  }
}

class MutateServer {
  private strategyFactory: Map<string, IMutateStrategyFactory> = new Map();

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
    this.strategyFactory.set('default', new DefaultMutateStrategyFactory());
  }

  setDocData(docId: string, newData, options: IMutateOptions = new DefaultSetStrategyOptions()) {
    const mutateStrategyFactory = this.strategyFactory.get(options.strategy);

    const updateStrategy = mutateStrategyFactory.createUpdateDocStrategy(
      docId,
      newData,
      options,
      this.memory,
      this.remote
    );

    return updateStrategy.exec();
  }

  updateDocData(docId: string, newData, options: IMutateOptions = new DefaultUpdateStrategyOptions()) {
    const mutateStrategyFactory = this.strategyFactory.get(options.strategy);

    const updateStrategy = mutateStrategyFactory.createUpdateDocStrategy(
      docId,
      newData,
      options,
      this.memory,
      this.remote
    );

    return updateStrategy.exec();
  }
}

class DocRef {
  constructor(private id: string, private syncServer: SyncServer, private mutateServer: MutateServer) {
  }

  sync(options?) {
    return this.syncServer.syncDoc(this.id, options);
  }

  // rewrite any previous values
  set(newData) {
    return this.mutateServer.setDocData(this.id, newData);
  }

  // partial update
  update(newData, options?: IMutateOptions) {
    return this.mutateServer.updateDocData(this.id, newData, options);
  }
}

class CollectionQueryRef {
  constructor(private collectionId: string, private syncServer: SyncServer) {
  }

  where(key, comparison, value) {
    return this;
  }

  sync() {
    const query = {};

    return this.syncServer.syncQuery(this.collectionId, query);
  }
}

class CollectionRef {
  constructor(private collectionId: string, private syncServer: SyncServer, private mutateServer: MutateServer) {
  }

  doc(docId: string) {
    return new DocRef(`${this.collectionId}/${docId}`, this.syncServer, this.mutateServer);
  }

  query() {
    return new CollectionQueryRef(this.collectionId, this.syncServer);
  }
}

class DatabaseManager {
  private syncServer = new SyncServer(this.memory, this.remote);
  private mutateServer = new MutateServer(this.memory, this.remote);

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  doc(id) {
    return new DocRef(id, this.syncServer, this.mutateServer);
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

// use case 1.1: two identical sync request
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

// use case 3: sync collection subset
/*databaseManager.collection('users')
  .query().where('parent', '=', null)
  .sync().passParamToMe().exec().then(() => {
  console.log(`collection query synced`);
});*/

// use case 4: mutate doc
databaseManager.doc('admin').update({}).then(() => {
  console.log(`updated`);
});

// use case 4: mutate doc using different strategy
databaseManager.doc('admin').update({}, new DefaultUpdateStrategyOptions()).then(() => {
  console.log(`updated`);
});


// use case 5: apply only latest mutate operation for 2 and more simultaneous mutate operations based on same doc
// I could not blindly discard the first update request, since they update different data.
/*const mutate1 = databaseManager.doc('admin').update({name: 'foo'});
const mutate2 = databaseManager.doc('admin').update({age: 12});

Promise.resolve([
  mutate1,
  mutate2,
]).then(() => {
  console.log(`done`);
});*/



