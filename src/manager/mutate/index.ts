import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';

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
      // this.memory.doc(this.docId).update(this.newData),
      // this.remote.doc(this.docId).update(this.newData)
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
      // this.memory.doc(this.docId).update(this.newData),
      // this.remote.doc(this.docId).update(this.newData)
    ]);
  }
}

export class MutateServer {
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
