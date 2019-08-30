import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {MutateServer} from '../mutate';
import {DocIdentificator, IQuery, QueryIdentificator} from '../query';
import {SnapshotServer} from '../snapshot';
import {ISyncOptions, SyncServer} from '../sync';

/**
 * Represent Document from client point of view.
 * Gather input data from the client and translate it to internal calls.
 */
export class DocRef {
  constructor(private collectionId: string,
              private docId: string,
              private syncServer: SyncServer,
              private mutateServer: MutateServer,
              private snapshotServer: SnapshotServer) {
  }

  sync(options: ISyncOptions = {}) {
    const docIdentificator = new DocIdentificator(this.collectionId, this.docId);

    return this.syncServer.syncDoc(docIdentificator, options);
  }

  // rewrite any previous values
  set(newData) {
    return this.mutateServer.setDocData(this.collectionId, newData);
  }

  // partial update
  update(newData) {
    return this.mutateServer.updateDocData(this.collectionId, newData);
  }

  snapshot() {
    const docIdentificator = new DocIdentificator(this.collectionId, this.docId);

    return this.snapshotServer.docSnapshot(docIdentificator);
  }
}

class CollectionQueryRef {
  constructor(private collectionId: string, private query: IQuery, private syncServer: SyncServer) {
  }

  where(key, comparison, value) {
    return this;
  }

  sync(options: ISyncOptions = {}) {
    // todo: need to implement
    const query = new QueryIdentificator(this.collectionId, {});

    return this.syncServer.syncQuery(query, options);
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

  query(query: IQuery = {}) {
    return new CollectionQueryRef(this.collectionId, query, this.syncServer);
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
