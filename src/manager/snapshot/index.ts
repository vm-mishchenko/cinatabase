import {Observable} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';
import {shareReplay, switchMap} from 'rxjs/operators';
import {IDatabase} from '../database';
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

  toJSON() {
    return this.docs.map((docSnapshot) => {
      return {
        id: docSnapshot.id,
        data: docSnapshot.data()
      };
    });
  }

  count() {
    return this.docs.length;
  }

  hasDocWithId(id: string) {
    return this.docs.some((docSnapshot) => {
      return docSnapshot.id === id;
    });
  }

  getDocWithId(id: string) {
    return this.docs.filter((docSnapshot) => {
      return docSnapshot.id === id;
    })[0];
  }
}

export class SnapshotServer {
  constructor(private memory: IDatabase,
              private remoteDb: IDatabase,
              private syncServer: SyncServer) {
  }

  docSnapshot(docIdentificator: DocIdentificator): Promise<DocSnapshot> {
    return this.syncServer.syncDoc(docIdentificator).then(() => {
      return this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot();
    });
  }

  docOnSnapshot(docIdentificator: DocIdentificator) {
    return fromPromise(this.syncServer.syncDoc(docIdentificator)).pipe(
      switchMap((): Observable<DocSnapshot> => {
        return this.memory.collection(docIdentificator.collectionId).doc(docIdentificator.docId).onSnapshot();
      }),
      shareReplay(1)
    );
  }

  /** Only memory query implemented now. */
  querySnapshot(queryIdentificator: QueryIdentificator,
                options: IQuerySnapshotOptions = defaultQuerySnapshotOptions
  ): Promise<QuerySnapshot> {
    const memoryCollection = this.memory.collection(queryIdentificator.collectionId);

    return Promise.resolve(memoryCollection.query(queryIdentificator.queryRequest).snapshot());
  }

  /** Only memory query implemented now. */
  queryOnSnapshot(queryIdentificator: QueryIdentificator,
                  options: IQuerySnapshotOptions = defaultQuerySnapshotOptions) {
    return this.memory.collection(queryIdentificator.collectionId).query(queryIdentificator.queryRequest).onSnapshot();
  }
}
