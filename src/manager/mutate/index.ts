import {IDatabase} from '../database';
import {DocIdentificator} from '../query';
import {SyncServer} from '../sync';

export interface IUpdateDocOptions {
  createDocIfNotExist?: boolean;
}

class DefaultSetDocStrategy {
  constructor(private docIdentificator: DocIdentificator,
              private newData: any,
              private memory: IDatabase,
              private remote: IDatabase) {
  }

  exec() {
    // Default strategy does not know cache strategies for underlying storage.
    // It runs all in parallel.

    this.memory.doc(this.docIdentificator.collectionId, this.docIdentificator.docId).set(this.newData);
    return this.remote.doc(this.docIdentificator.collectionId, this.docIdentificator.docId).set(this.newData);
  }
}

class DefaultUpdateDocStrategy {
  constructor(private docIdentificator: DocIdentificator,
              private newData: any,
              private options: IUpdateDocOptions = {},
              private memory: IDatabase,
              private remote: IDatabase) {
  }

  exec() {
    // Default strategy does not know cache strategies for underlying storage.
    // It runs all in parallel.
    const memoryDoc = this.memory.collection(this.docIdentificator.collectionId).doc(this.docIdentificator.docId);
    const remoteDoc = this.remote.collection(this.docIdentificator.collectionId).doc(this.docIdentificator.docId);

    // update memory doc in a sync manner
    memoryDoc.update(this.newData);

    return remoteDoc.isExist().then(() => {
      remoteDoc.update(this.newData);
    }, (error) => {
      if (this.options.createDocIfNotExist) {
        remoteDoc.set(this.newData);
        return Promise.resolve();
      }

      // remove since doc is not exists
      memoryDoc.remove();

      return Promise.reject(error);
    });
  }
}

export class MutateServer {
  constructor(private memory: IDatabase, private remote: IDatabase,
              private syncServer: SyncServer) {
  }

  setDocData(docIdentificator: DocIdentificator, newData): Promise<any> {
    const setDocStrategy = new DefaultSetDocStrategy(docIdentificator, newData, this.memory, this.remote);

    return setDocStrategy.exec().then(() => {
      this.syncServer.invalidateQueryCacheForCollection(docIdentificator.collectionId);
    });
  }

  updateDocData(docIdentificator: DocIdentificator, newData, options?: IUpdateDocOptions) {
    const updateStrategy = new DefaultUpdateDocStrategy(
      docIdentificator,
      newData,
      options,
      this.memory,
      this.remote);

    return updateStrategy.exec().then(() => {
      this.syncServer.invalidateQueryCacheForCollection(docIdentificator.collectionId);
    });
  }

  removeDocData(docIdentificator: DocIdentificator) {
    const memoryDoc = this.memory.doc(docIdentificator.collectionId, docIdentificator.docId);
    const remoteDoc = this.remote.doc(docIdentificator.collectionId, docIdentificator.docId);

    // remote from memory in a sync manner
    memoryDoc.remove();

    // todo: dont now the right strategy, for now just wait from the both store
    return remoteDoc.remove().then(() => {
      this.syncServer.invalidateQueryCacheForCollection(docIdentificator.collectionId);
    });
  }

  removeAllData() {
    this.syncServer.invalidate();
    this.memory.removeAllData();
    return this.remote.removeAllData();
  }
}
