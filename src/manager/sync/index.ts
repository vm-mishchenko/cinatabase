import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {DocIdentificator, ITrackableIdentificator, QueryIdentificator} from '../query';

export interface ISyncOptions {
  /** sync despite the fact that query was previously synced */
  force?: boolean;
}

interface ISyncStrategy {
  exec(): Promise<any>;
}

class DefaultQuerySyncStrategy implements ISyncStrategy {
  constructor(private collectionQuery: QueryIdentificator,
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
  constructor(private docQuery: DocIdentificator,
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

export class SyncServer {
  private previouslySyncedQueries: Map<string, ITrackableIdentificator> = new Map();
  private syncInProgress: Map<string, Promise<any>> = new Map();

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  syncDoc(docIdentificator: DocIdentificator, options: ISyncOptions = {}) {
    const syncStrategy = new DefaultDocSyncStrategy(
      docIdentificator,
      options,
      this.memory,
      this.remote
    );

    return this.sync(syncStrategy, docIdentificator, options);
  }

  syncQuery(collectionQuery: QueryIdentificator, options?: ISyncOptions) {
    const syncStrategy = new DefaultQuerySyncStrategy(
      collectionQuery,
      options,
      this.memory,
      this.remote
    );

    return this.sync(syncStrategy, collectionQuery, options);
  }

  private sync(strategy: ISyncStrategy, trackableQuery: ITrackableIdentificator, options: ISyncOptions) {
    // query was already synced
    if (!options.force && this.previouslySyncedQueries.has(trackableQuery.identificator)) {
      return Promise.resolve();
    }

    // sync in progress, return promise
    if (this.syncInProgress.has(trackableQuery.identificator)) {
      return this.syncInProgress.get(trackableQuery.identificator);
    }

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
