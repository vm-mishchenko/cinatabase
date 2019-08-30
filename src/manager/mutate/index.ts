import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {DocIdentificator} from '../query';

export interface IUpdateDocOptions {
  createDocIfNotExist?: boolean;
}

class DefaultSetDocStrategy {
  constructor(private docIdentificator: DocIdentificator,
              private newData: any,
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    // Default strategy does not know cache strategies for underlying storage.
    // It runs all in parallel.
    return Promise.all([
      this.memory.doc(this.docIdentificator.collectionId, this.docIdentificator.docId).set(this.newData),
      this.remote.doc(this.docIdentificator.collectionId, this.docIdentificator.docId).set(this.newData)
    ]);
  }
}

class DefaultUpdateDocStrategy {
  constructor(private docIdentificator: DocIdentificator,
              private newData: any,
              private options: IUpdateDocOptions = {},
              private memory: MemoryDb,
              private remote: RemoteDb) {
  }

  exec() {
    // Default strategy does not know cache strategies for underlying storage.
    // It runs all in parallel.
    const memoryDoc = this.memory.doc(this.docIdentificator.collectionId, this.docIdentificator.docId);
    const remoteDoc = this.remote.doc(this.docIdentificator.collectionId, this.docIdentificator.docId);

    return remoteDoc.isExist().then(() => {
      memoryDoc.update(this.newData);
      remoteDoc.update(this.newData);
    }, (error) => {
      if (this.options.createDocIfNotExist) {
        memoryDoc.set(this.newData);
        remoteDoc.set(this.newData);

        return Promise.resolve();
      }

      return Promise.reject(error);
    });
  }
}

export class MutateServer {
  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  setDocData(docIdentificator: DocIdentificator, newData) {
    const setDocStrategy = new DefaultSetDocStrategy(docIdentificator, newData, this.memory, this.remote);

    return setDocStrategy.exec();
  }

  updateDocData(docIdentificator: DocIdentificator, newData, options?: IUpdateDocOptions) {
    const updateStrategy = new DefaultUpdateDocStrategy(
      docIdentificator,
      newData,
      options,
      this.memory,
      this.remote);

    return updateStrategy.exec();
  }
}
