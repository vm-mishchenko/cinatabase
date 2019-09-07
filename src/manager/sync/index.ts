import {IDatabase} from '../database';
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
              private memory: IDatabase,
              private remote: IDatabase) {
  }

  exec() {
    const memoryCollection = this.memory.collection(this.collectionQuery.collectionId);
    const remoteCollection = this.remote.collection(this.collectionQuery.collectionId);

    // translate query to remoteQuery
    const remoteQuery = remoteCollection.query(this.collectionQuery.queryRequest);

    return remoteQuery.snapshot().then((remoteDocuments) => {
      remoteDocuments.forEach((remoteDoc) => {
        const {id, ...remoteDocData} = remoteDoc;

        memoryCollection.doc(id).set(remoteDocData);
      });
    });
  }
}

class DefaultDocSyncStrategy implements ISyncStrategy {
  constructor(private docQuery: DocIdentificator,
              private options: any,
              private memory: IDatabase,
              private remote: IDatabase) {
  }

  exec() {
    const memoryDoc = this.memory.collection(this.docQuery.collectionId).doc(this.docQuery.docId);

    if (memoryDoc.isExists()) {
      return Promise.resolve(memoryDoc.snapshot());
    }

    return this.remote.collection(this.docQuery.collectionId).doc(this.docQuery.docId).snapshot()
      .then((remoteDocSnapshot) => {
        if (remoteDocSnapshot.exists) {
          memoryDoc.set(remoteDocSnapshot.data());
        } else {
          console.warn(`Cannot sync for "${this.docQuery.collectionId}/${this.docQuery.docId}"`);

          return Promise.reject();
        }
      });
  }
}

export class SyncServer {
  private previouslySyncedQueries: Map<string, ITrackableIdentificator> = new Map();
  private syncInProgress: Map<string, Promise<any>> = new Map();

  constructor(private memory: IDatabase, private remote: IDatabase) {
  }

  isIdentificatorSynced(trackableIdentificator: ITrackableIdentificator) {
    return this.previouslySyncedQueries.has(trackableIdentificator.identificator);
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

  private sync(strategy: ISyncStrategy, trackableIdentificator: ITrackableIdentificator, options: ISyncOptions) {
    // query was already synced
    if (!options.force && this.previouslySyncedQueries.has(trackableIdentificator.identificator)) {
      return Promise.resolve();
    }

    // sync in progress, return promise
    if (this.syncInProgress.has(trackableIdentificator.identificator)) {
      console.warn(`Double sync for "${trackableIdentificator.identificator}" identificator.`);
      return this.syncInProgress.get(trackableIdentificator.identificator);
    }

    // start syncing
    const syncPromise = strategy.exec()
      .then(() => {
      }, () => {
        // sync is failed because remote doc does not exists
        // but for the client perspective sync is finished
        // and it does not matter whether there is remote doc or not
        return Promise.resolve();
      }).finally(() => {
        // mark all sync as completed, even when there were no remote doc
        // any mutate operations eventually adds doc to memory and remote storage later
        this.previouslySyncedQueries.set(trackableIdentificator.identificator, trackableIdentificator);
        this.syncInProgress.delete(trackableIdentificator.identificator);
      });

    // cache sync operation based on query representation
    // but not on query instance
    this.syncInProgress.set(trackableIdentificator.identificator, syncPromise);

    // clean doc operation after
    return syncPromise;
  }
}
