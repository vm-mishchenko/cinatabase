import {fromPromise} from 'rxjs/internal-compatibility';
import {shareReplay, switchMap} from 'rxjs/operators';
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
  exists = Boolean(this.docData);

  constructor(public readonly id: string, private readonly docData: any) {
  }

  data() {
    return this.docData;
  }
}

export class QuerySnapshot {
  constructor(private docs: DocSnapshot[]) {
  }

  data() {
    return this.docs;
  }

  count() {
    return this.docs.length;
  }
}

export class SnapshotServer {
  constructor(private memory: MemoryDb,
              private remoteDb: RemoteDb,
              private syncServer: SyncServer) {
  }

  docSnapshot(docIdentificator: DocIdentificator): Promise<DocSnapshot> {
    return this.syncServer.syncDoc(docIdentificator).then(() => {
      const memoryDoc = this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot();

      return new DocSnapshot(docIdentificator.docId, memoryDoc);
    });
  }

  docOnSnapshot(docIdentificator: DocIdentificator) {
    return fromPromise(this.syncServer.syncDoc(docIdentificator)).pipe(
      switchMap(() => {
        return this.memory.collection(docIdentificator.collectionId).doc(docIdentificator.docId).onSnapshot();
      }),
      shareReplay(1)
    );
  }

  querySnapshot(queryIdentificator: QueryIdentificator,
                options: IQuerySnapshotOptions = defaultQuerySnapshotOptions
  ): Promise<QuerySnapshot> {
    const memoryCollection = this.memory.collection(queryIdentificator.collectionId);

    return Promise.resolve(memoryCollection.query(queryIdentificator.queryRequest).snapshot());
  }
}
