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
  source: 'remote'
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
              // todo: remote remote, it does not need for snapshot
              private remote: IDatabase,
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

  querySnapshot(queryIdentificator: QueryIdentificator,
                options: IQuerySnapshotOptions = defaultQuerySnapshotOptions
  ): Promise<QuerySnapshot> {
    if (options.source === 'memory') {
      const memoryCollection = this.memory.collection(queryIdentificator.collectionId);

      return Promise.resolve(memoryCollection.query(queryIdentificator.queryRequest).snapshot());
    } else if (options.source === 'remote') {
      // sync service sync docs then cache synced doc ids and returns them
      return this.syncServer.syncQuery(queryIdentificator).then((docIds) => {
        // todo: in future memory database should return docs
        const syncedDocs = this.memory.collection(queryIdentificator.collectionId).query().snapshot().data().filter((docSnapshot) => {
          return docIds.includes(docSnapshot.id);
        });

        return new QuerySnapshot(syncedDocs);
      });
    } else {
      console.warn(`Snapshot does not support "${options.source}" source.`);
    }
  }

  /** Only memory query implemented now. */
  queryOnSnapshot(queryIdentificator: QueryIdentificator,
                  options: IQuerySnapshotOptions = defaultQuerySnapshotOptions) {
    return this.memory.collection(queryIdentificator.collectionId).query(queryIdentificator.queryRequest).onSnapshot();
  }
}
