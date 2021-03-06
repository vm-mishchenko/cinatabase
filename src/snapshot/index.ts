import {Observable} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';
import {shareReplay, switchMap} from 'rxjs/operators';
import {IDatabase} from '../database/interfaces';
import {DocIdentificator, QueryIdentificator} from '../query';
import {SyncServer} from '../sync';
import {IDocSnapshot, IQuerySnapshot} from './interfaces';

export interface IQuerySnapshotOptions {
  source?: string;
}

const defaultQuerySnapshotOptions = {
  source: 'remote'
};

export class DocSnapshot<IDoc> implements IDocSnapshot<IDoc> {
  exists = Boolean(this.docData);

  constructor(readonly id: string, private readonly docData: any) {
  }

  data() {
    return this.docData;
  }
}

export class QuerySnapshot<IDoc> implements IQuerySnapshot<IDoc> {
  constructor(private docs: Array<IDocSnapshot<IDoc>>) {
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

  docSnapshot<IDoc>(docIdentificator: DocIdentificator): Promise<IDocSnapshot<IDoc>> {
    return this.syncServer.syncDoc(docIdentificator).then(() => {
      return this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot();
    });
  }

  docOnSnapshot<IDoc>(docIdentificator: DocIdentificator): Observable<IDocSnapshot<IDoc>> {
    return fromPromise(this.syncServer.syncDoc(docIdentificator)).pipe(
      switchMap((): Observable<IDocSnapshot<IDoc>> => {
        return this.memory.collection(docIdentificator.collectionId).doc(docIdentificator.docId).onSnapshot();
      }),
      shareReplay(1)
    );
  }

  querySnapshot<IDoc>(queryIdentificator: QueryIdentificator,
                      options: IQuerySnapshotOptions = defaultQuerySnapshotOptions
  ): Promise<QuerySnapshot<IDoc>> {
    if (options.source === 'memory') {
      const memoryCollection = this.memory.collection(queryIdentificator.collectionId);

      return Promise.resolve(memoryCollection.query(queryIdentificator.queryRequest).snapshot());
    } else if (options.source === 'remote') {
      // sync service sync docs then cache synced doc ids and returns them
      return this.syncServer.syncQuery(queryIdentificator).then((docIds) => {
        // todo: in future memory manager should return docs
        const syncedDocs = this.memory.collection(queryIdentificator.collectionId)
          .query().snapshot().data().filter((docSnapshot) => {
            return docIds.includes(docSnapshot.id);
          });

        return new QuerySnapshot<IDoc>(syncedDocs);
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
