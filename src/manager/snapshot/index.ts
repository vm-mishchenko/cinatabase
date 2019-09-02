import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {DocIdentificator, QueryIdentificator} from '../query';
import {SyncServer} from '../sync';

export interface IQuerySnapshotOptions {
  source?: string;
}

const defaultQuerySnapshotOptions = {
  source: 'memory'
};

export class DocSnapshot {
  id = this.docData && this.docData.id;
  exists = Boolean(this.docData);

  constructor(private docData: any) {
  }

  data() {
    const {id, ...data} = this.docData;
    return data;
  }
}

export class QuerySnapshot {
  constructor(private docs: any[]) {
  }

  data() {
    return this.docs;
  }

  count() {
    return this.docs.length;
  }
}

export class SnapshotServer {
  private syncInProgress: Map<string, Promise<any>> = new Map();

  constructor(private memory: MemoryDb,
              private remoteDb: RemoteDb,
              private syncServer: SyncServer) {
  }


  docSnapshot(docIdentificator: DocIdentificator): Promise<DocSnapshot> {
    // check whether it was already synced
    if (this.syncServer.isIdentificatorSynced(docIdentificator)) {
      // return snapshot from the memory store
      return Promise.resolve(this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot());
    }

    // doc was not synced before, check maybe sync in progress
    if (!this.syncInProgress.has(docIdentificator.identificator)) {
      // starts sync doc
      const snapshotPromise = this.syncServer.syncDoc(docIdentificator).then(() => {
        const memoryDoc = this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot();

        return new DocSnapshot(memoryDoc);
      });

      this.syncInProgress.set(docIdentificator.identificator, snapshotPromise);
    }

    return this.syncInProgress.get(docIdentificator.identificator);
  }

  querySnapshot(queryIdentificator: QueryIdentificator, options: IQuerySnapshotOptions = defaultQuerySnapshotOptions) {
    const memoryCollection = this.memory.collection(queryIdentificator.collectionId);
    const memoryQuerySnapshot = memoryCollection.query(queryIdentificator.queryRequest).snapshot();
    const querySnapshot = new QuerySnapshot(memoryQuerySnapshot);

    return Promise.resolve(querySnapshot);
  }
}
