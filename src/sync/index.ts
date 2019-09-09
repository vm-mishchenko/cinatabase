import {IMemoryDatabase} from '../memory/interfaces';
import {DocIdentificator, QueryIdentificator} from '../query';
import {IRemoteDatabase} from '../remote/interfaces';

export interface ISyncOptions {
  /** Sync even if the doc was previously synced or exists in the memory. */
  // that's useful after sync with remote server
  force?: boolean;

  /** Removes doc from memory store if doc does not found in remote db. */
  // Useful after sync with remote server where fresh version of remote store
  // does not contains memory doc that was previously synced.
  // During normal usage is not so useful, since doc is added to memory in synchronous mode
  //  wheres write to memory happen with some delay.
  removeFromMemory?: boolean;
}

// map query identificator to docIds
type ICollectionQueryCache = Map<string, string[]>

class CollectionQueryCacheStorage {
  // map collectionId to identificator and docIds
  private cache: Map<string, ICollectionQueryCache> = new Map();

  has(queryIdentificator: QueryIdentificator) {
    // were queries cached for collection
    if (!this.cache.has(queryIdentificator.collectionId)) {
      return false;
    }

    // is there specific query in collection
    const collectionQueryCacheMap = this.cache.get(queryIdentificator.collectionId);
    return collectionQueryCacheMap.has(queryIdentificator.identificator);
  }

  set(queryIdentificator: QueryIdentificator, docIds: string[]) {
    if (!this.cache.has(queryIdentificator.collectionId)) {
      this.cache.set(queryIdentificator.collectionId, new Map());
    }

    const collectionQueryCacheMap = this.cache.get(queryIdentificator.collectionId);

    collectionQueryCacheMap.set(queryIdentificator.identificator, docIds);
  }

  get(queryIdentificator: QueryIdentificator): string[] {
    const collectionQueryCacheMap = this.cache.get(queryIdentificator.collectionId);

    return collectionQueryCacheMap.get(queryIdentificator.identificator);
  }

  invalidate(collectionId) {
    this.cache.delete(collectionId);
  }
}

export class SyncServer {
  // contains doc identificators
  // todo: find a way to add type for it
  private syncedDoc: Map<string, DocIdentificator> = new Map();
  private syncInProgress: Map<string, Promise<any>> = new Map();

  // query identificator to doc id
  // todo: find a way to create type for it for better readability
  private syncedQueryToDocIdMap: CollectionQueryCacheStorage = new CollectionQueryCacheStorage();

  // store all queries which client requested during the session
  // we cannot use syncedQueryToDocIdMap because it is cleared after mutate operation
  // map query unique identificator to the QueryIdentificator
  private sessionUniqueQueryIdentificators: Map<string, QueryIdentificator> = new Map();

  constructor(private memory: IMemoryDatabase, private remote: IRemoteDatabase) {
  }

  // sync with remote server
  syncWithServer() {
    // todo: in future I need to wait for all sync and mutate operations
    return this.remote.syncWithServer().then(() => {
      const sessionUniqueQueryIdentificators = this.sessionUniqueQueryIdentificators.values();
      // invalidate all sync service cache
      this.invalidate();

      // re-sync every doc which is stored in memory collection. If doc still exists in remote
      // it will be updated in memory, if not it will be deleted
      const collectionsPromises = this.memory.collections().map((collection) => {
        const docPromises = collection.query().snapshot().data().map((docSnapshot) => {
          return this.syncDoc(new DocIdentificator(collection.collectionId, docSnapshot.id), {
            force: true,
            removeFromMemory: true
          });
        });

        return Promise.all(docPromises);
      });

      return Promise.all(collectionsPromises).then(() => {
        // sync all queries which client requested before sync with server.
        // It may add additional docs to the memory.
        const syncAllQueryPromise = Array.from(sessionUniqueQueryIdentificators).map((queryIdentificator) => {
          return this.syncQuery(queryIdentificator);
        });

        return syncAllQueryPromise;
      });
    });
  }

  syncDoc(docIdentificator: DocIdentificator, options: ISyncOptions = {}) {
    const memoryDoc = this.memory.collection(docIdentificator.collectionId).doc(docIdentificator.docId);

    if (!options.force) {
      // doc might exists in memory db but does not present in sync cache
      // it happens during mutate operations - doc is added to both stores
      // but "sync" method is not necessary
      if (this.syncedDoc.has(docIdentificator.identificator) || memoryDoc.isExists()) {
        return Promise.resolve();
      }
    }

    const syncPromise = this.remote.collection(docIdentificator.collectionId).doc(docIdentificator.docId).snapshot()
      .then((remoteDocSnapshot) => {
        if (remoteDocSnapshot.exists) {
          memoryDoc.set(remoteDocSnapshot.data());
        } else {
          console.warn(`Sync failed no remote doc "${docIdentificator.collectionId}/${docIdentificator.docId}"`);
          // remote memory doc if such does not exists in remote storage
          if (options.removeFromMemory) {
            memoryDoc.remove();
          }

          // sync is failed because remote doc does not exists
          // but for the client perspective sync is finished
          // and it does not matter whether there is remote doc or not
          return Promise.resolve();
        }
      }).finally(() => {
        // mark all sync as completed, even when there were no remote doc
        // any mutate operations eventually adds doc to memory and remote storage later
        this.syncInProgress.delete(docIdentificator.identificator);
        this.syncedDoc.set(docIdentificator.identificator, docIdentificator);
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
    // store all unique query requested during the session, will use it after sync with remote store
    // to update memory db
    if (!this.sessionUniqueQueryIdentificators.has(collectionQuery.identificator)) {
      this.sessionUniqueQueryIdentificators.set(collectionQuery.identificator, collectionQuery);
    }

    // query was already synced before
    if (this.syncedQueryToDocIdMap.has(collectionQuery)) {
      console.info(`Returns sync from the cache for "${collectionQuery.identificator}"`);
      return Promise.resolve(this.syncedQueryToDocIdMap.get(collectionQuery));
    }

    // sync in progress, return promise
    if (this.syncInProgress.has(collectionQuery.identificator)) {
      console.warn(`Double sync for "${collectionQuery.identificator}" identificator.`);
      return this.syncInProgress.get(collectionQuery.identificator);
    }

    console.info(`New query sync for "${collectionQuery.identificator}"`);

    const memoryCollection = this.memory.collection(collectionQuery.collectionId);
    const remoteCollection = this.remote.collection(collectionQuery.collectionId);

    const remoteQuery = remoteCollection.query(collectionQuery.queryRequest);

    const syncPromise = remoteQuery.snapshot()
      .then((remoteQuerySnapshot) => {
        // update memory manager
        remoteQuerySnapshot.docs.forEach((remoteDocSnapshot) => {
          memoryCollection.doc(remoteDocSnapshot.id).set(remoteDocSnapshot.data());
        });

        // cache remote doc ids against query
        const docIds = remoteQuerySnapshot.docs.map((docSnapshot) => docSnapshot.id);
        this.syncedQueryToDocIdMap.set(collectionQuery, docIds);

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

  invalidate() {
    this.syncedDoc = new Map();
    this.syncedQueryToDocIdMap = new CollectionQueryCacheStorage();
  }
  
  invalidateQueryCacheForCollection(collectionId: string) {
    this.syncedQueryToDocIdMap.invalidate(collectionId);
  }
}
