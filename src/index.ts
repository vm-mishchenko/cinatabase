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

      const syncPromise = sync.exec();

      this.syncDocOperations.set(docId, syncPromise);

      // clean doc operation after
      syncPromise.finally(() => {
        this.syncDocOperations.delete(docId);
      });
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

    return sync.exec();
  }
}

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
  update(newData) {
    return this.mutateServer.updateDocData(this.id, newData);
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

