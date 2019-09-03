import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {IUpdateDocOptions, MutateServer} from '../mutate';
import {DocIdentificator, IQueryRequest, QueryIdentificator} from '../query';
import {IQuerySnapshotOptions, SnapshotServer} from '../snapshot';
import {ISyncOptions, SyncServer} from '../sync';

/**
 * Represent Document from client point of view.
 * Gather input data from the client and translate it to internal calls.
 */
export class DocRef {
  private docIdentificator = new DocIdentificator(this.collectionId, this.docId);

  constructor(private collectionId: string,
              private docId: string,
              private syncServer: SyncServer,
              private mutateServer: MutateServer,
              private snapshotServer: SnapshotServer) {
  }

  sync(options: ISyncOptions = {}) {
    return this.syncServer.syncDoc(this.docIdentificator, options);
  }

  // rewrite any previous values
  set(newData) {
    return this.mutateServer.setDocData(this.docIdentificator, newData);
  }

  // partial update
  update(newData, options?: IUpdateDocOptions) {
    return this.mutateServer.updateDocData(
      this.docIdentificator,
      newData,
      options
    );
  }

  /**
   * Returns doc snapshot.
   * Client does care whether doc was taken from the memory or remote databases.
   */
  snapshot() {
    return this.snapshotServer.docSnapshot(this.docIdentificator);
  }

  onSnapshot() {
    return this.snapshotServer.docOnSnapshot(this.docIdentificator);
  }

  // check whether it exists in the remote store
  isExists() {
    this.snapshotServer.docSnapshot(this.docIdentificator).then((snapshot) => {
      return snapshot.exists ? Promise.resolve() : Promise.reject();
    });
  }
}

class CollectionQueryRef {
  constructor(private collectionId: string,
              private queryRequest: IQueryRequest,
              private syncServer: SyncServer,
              private snapshotServer: SnapshotServer) {
  }

  where(key, comparison, value) {
    return this;
  }

  limit(count: number) {
    return this;
  }

  sync(options: ISyncOptions = {}) {
    const query = new QueryIdentificator(this.collectionId, {});

    return this.syncServer.syncQuery(query, options);
  }

  snapshot(options?: IQuerySnapshotOptions) {
    return this.snapshotServer.querySnapshot(this.queryIdentificator(), options);
  }

  queryIdentificator() {
    // todo: need to implement
    return new QueryIdentificator(this.collectionId, {});
  }
}

export class CollectionRef {
  constructor(private collectionId: string,
              private syncServer: SyncServer,
              private mutateServer: MutateServer,
              private snapshotServer: SnapshotServer) {
  }

  doc(docId: string) {
    return new DocRef(this.collectionId, docId, this.syncServer, this.mutateServer, this.snapshotServer);
  }

  query(queryRequest: IQueryRequest = {}) {
    return new CollectionQueryRef(this.collectionId, queryRequest, this.syncServer, this.snapshotServer);
  }
}

export class DatabaseManager {
  private defaultCollectionId = 'DEFAULT_COLLECTION_ID';
  private syncServer = new SyncServer(this.memory, this.remote);
  private mutateServer = new MutateServer(this.memory, this.remote);
  private snapshotServer = new SnapshotServer(this.memory, this.remote, this.syncServer);

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  doc(docId: string) {
    return new DocRef(this.defaultCollectionId, docId, this.syncServer, this.mutateServer, this.snapshotServer);
  }

  collection(id) {
    return new CollectionRef(id, this.syncServer, this.mutateServer, this.snapshotServer);
  }
}
