import {IMemoryDatabase} from '../memory/interfaces';
import {IUpdateDocOptions, MutateServer} from '../mutate';
import {DocIdentificator, IQueryRequest, QueryIdentificator} from '../query';
import {IRemoteDatabase} from '../remote/interfaces';
import {IQuerySnapshotOptions, SnapshotServer} from '../snapshot';
import {ISyncOptions, SyncServer} from '../sync';
import {ICollectionQueryRef, ICollectionRef, IDocRef} from './interfaces';

/**
 * Represent Document from client point of view.
 * Gather input data from the client and translate it to internal calls.
 */
export class DocRef<IDoc> implements IDocRef<IDoc> {
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
    return this.snapshotServer.docSnapshot<IDoc>(this.docIdentificator);
  }

  onSnapshot() {
    return this.snapshotServer.docOnSnapshot<IDoc>(this.docIdentificator);
  }

  // check whether it exists in the remote store
  isExists() {
    return this.snapshotServer.docSnapshot(this.docIdentificator).then((snapshot) => {
      return snapshot.exists ? Promise.resolve() : Promise.reject();
    });
  }

  remove() {
    return this.mutateServer.removeDocData(
      this.docIdentificator,
    );
  }
}

export class CollectionRef<IDoc> implements ICollectionRef<IDoc> {
  constructor(private collectionId: string,
              private syncServer: SyncServer,
              private mutateServer: MutateServer,
              private snapshotServer: SnapshotServer) {
  }

  doc(docId: string) {
    return new DocRef<IDoc>(this.collectionId, docId, this.syncServer, this.mutateServer, this.snapshotServer);
  }

  query(queryRequest: IQueryRequest = {}) {
    return new CollectionQueryRef<IDoc>(this.collectionId, queryRequest, this.syncServer, this.snapshotServer);
  }
}

class CollectionQueryRef<IDoc> implements ICollectionQueryRef<IDoc> {
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
    return this.syncServer.syncQuery(this.queryIdentificator(), options);
  }

  snapshot(options?: IQuerySnapshotOptions) {
    return this.snapshotServer.querySnapshot<IDoc>(this.queryIdentificator(), options);
  }

  onSnapshot(options?: IQuerySnapshotOptions) {
    return this.snapshotServer.queryOnSnapshot(this.queryIdentificator(), options);
  }

  private queryIdentificator() {
    return new QueryIdentificator(this.collectionId, this.queryRequest);
  }
}

export class DatabaseManager {
  private defaultCollectionId = 'DEFAULT_COLLECTION_ID';
  private syncServer = new SyncServer(this.memory, this.remote);
  private mutateServer = new MutateServer(this.memory, this.remote, this.syncServer);
  private snapshotServer = new SnapshotServer(this.memory, this.remote, this.syncServer);

  constructor(private memory: IMemoryDatabase, private remote: IRemoteDatabase) {
  }

  doc<IDoc>(docId: string) {
    return new DocRef<IDoc>(this.defaultCollectionId, docId, this.syncServer, this.mutateServer, this.snapshotServer);
  }

  collection<IDoc>(id) {
    return new CollectionRef<IDoc>(id, this.syncServer, this.mutateServer, this.snapshotServer);
  }

  // sync manager with remote server
  syncWithServer() {
    return this.syncServer.syncWithServer();
  }

  removeAllData() {
    this.mutateServer.removeAllData();
  }
}
