import {IDatabase} from '../database';
import {DocIdentificator, QueryIdentificator} from '../query';

export interface ISyncOptions {
  /** sync despite the fact that query was previously synced */
  force?: boolean;
}

export class SyncServer {
  // contains doc identificators
  // todo: find a way to add type for it
  private syncedDoc: Set<string> = new Set();
  private syncInProgress: Map<string, Promise<any>> = new Map();

  // query identificator to doc id
  // todo: find a way to create type for it for better readability
  private syncedQueryToDocIdMap: Map<string, string[]> = new Map();

  constructor(private memory: IDatabase, private remote: IDatabase) {
  }

  syncDoc(docIdentificator: DocIdentificator, options: ISyncOptions = {}) {
    const memoryDoc = this.memory.collection(docIdentificator.collectionId).doc(docIdentificator.docId);

    if (this.syncedDoc.has(docIdentificator.identificator)) {
      return Promise.resolve();
    }

    const syncPromise = this.remote.collection(docIdentificator.collectionId).doc(docIdentificator.docId).snapshot()
      .then((remoteDocSnapshot) => {
        if (remoteDocSnapshot.exists) {
          memoryDoc.set(remoteDocSnapshot.data());
        } else {
          console.warn(`Sync failed no remote doc "${docIdentificator.collectionId}/${docIdentificator.docId}"`);

          // sync is failed because remote doc does not exists
          // but for the client perspective sync is finished
          // and it does not matter whether there is remote doc or not
          return Promise.resolve();
        }
      }).finally(() => {
        // mark all sync as completed, even when there were no remote doc
        // any mutate operations eventually adds doc to memory and remote storage later
        this.syncInProgress.delete(docIdentificator.identificator);
        this.syncedDoc.add(docIdentificator.identificator);
      });

    // cache sync operation based on query representation
    // but not on query instance
    this.syncInProgress.set(docIdentificator.identificator, syncPromise);

    // clean doc operation after
    return syncPromise;
  }

  /**
   * @return Array of doc ids which were synced with memory store for particular query
   */
  syncQuery(collectionQuery: QueryIdentificator, options?: ISyncOptions): Promise<string[]> {
    // query was already synced before
    if (this.syncedQueryToDocIdMap.has(collectionQuery.identificator)) {
      console.info(`Returns sync from the cache for "${collectionQuery.identificator}"`);
      return Promise.resolve(this.syncedQueryToDocIdMap.get(collectionQuery.identificator));
    }

    // sync in progress, return promise
    if (this.syncInProgress.has(collectionQuery.identificator)) {
      console.warn(`Double sync for "${collectionQuery.identificator}" identificator.`);
      return this.syncInProgress.get(collectionQuery.identificator);
    }

    const memoryCollection = this.memory.collection(collectionQuery.collectionId);
    const remoteCollection = this.remote.collection(collectionQuery.collectionId);

    const remoteQuery = remoteCollection.query(collectionQuery.queryRequest);

    const syncPromise = remoteQuery.snapshot()
      .then((remoteQuerySnapshot) => {
        // update memory database
        remoteQuerySnapshot.docs.forEach((remoteDocSnapshot) => {
          memoryCollection.doc(remoteDocSnapshot.id).set(remoteDocSnapshot.data());
        });

        // cache remote doc ids against query
        const docIds = remoteQuerySnapshot.docs.map((docSnapshot) => docSnapshot.id);
        this.syncedQueryToDocIdMap.set(collectionQuery.identificator, docIds);

        // return synced doc ids for the query
        return docIds;
      }).finally(() => {
        this.syncInProgress.delete(collectionQuery.identificator);
      });

    // cache sync operation based on query representation
    // but not on query instance
    this.syncInProgress.set(collectionQuery.identificator, syncPromise);

    // clean doc operation after
    return syncPromise;
  }
}
