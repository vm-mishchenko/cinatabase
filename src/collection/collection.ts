import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {IDoc, IDocData, IDocSnapshot} from '../document/doc';
import {IDocFactory} from '../document/doc.factory';
import {IRemoteStore} from '../interfaces';
import {Sync} from './sync';

/**
 * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
 * representing the results of a query. The documents can be accessed as an
 * array via the `docs` property or enumerated using the `forEach` method. The
 * number of documents can be determined via the `empty` and `size`
 * properties.
 */
export interface IQuerySnapshot {
  docSnapshots: IDocSnapshot[];

  size(): number;
}

export class QuerySnapshot implements IQuerySnapshot {
  constructor(public docSnapshots: IDocSnapshot[]) {
  }

  size(): number {
    return this.docSnapshots.length;
  }
}

export interface IQuery {
  onSnapshot(): IQuerySnapshot;
}

export interface ICollection {
  doc(name: string): IDoc;

  // todo: add interface
  query(options: any): Query;

  sync(options: any): Sync;
}

// todo: add interface
// Store query configuration, does not store any data associated with the doc.
export class Query {
  private docs$: Observable<Map<string, IDoc>> = this.internalCollection.onSnapshot();
  private docsSnapshot: Observable<Map<string, any>> = this.internalCollection.onSnapshot().pipe(
    map((docs) => {
      return Array.from(docs.entries()).reduce((result, [docName, doc]) => {
        // todo: need to fix it somehow, broken after doc was changed to doc-ref
        // result.set(docName, doc.snapshot());

        return result;
      }, new Map());
    }),
  );

  constructor(private internalCollection: InternalCollection,
              private options: IQueryOptions) {
  }

  get(): Promise<IQuerySnapshot> {
    const syncPromise = this.options.cached ? Promise.resolve() : Promise.resolve();

    return syncPromise.then(() => {
      return Promise.all(
        Array.from(this.internalCollection.docs.entries()).map(([i, doc]) => doc.get())
      ).then((docsSnapshots) => {
        return new QuerySnapshot(docsSnapshots);
      });
    });
  }

  onSnapshot(): Observable<Map<string, any>> {
    return this.docsSnapshot;
  }
}

export interface IQueryOptions {
  // defines should the new docs be fetched from remote storage
  cached: boolean;
}

export class InternalCollection {
  // already initialized documents
  docs: Map<string, IDoc> = new Map();
  docs$: Observable<Map<string, IDoc>> = new BehaviorSubject<Map<string, IDoc>>(new Map());

  constructor(
    private name: string,
    private docFactory: IDocFactory,
    private remoteStore: IRemoteStore) {
  }

  id(): string {
    return this.name;
  }

  // instantiate new or return existence doc
  // newly doc would not be stored in pouch-db until set/update call
  doc(id): IDoc {
    if (!this.docs.has(id)) {
      this.registerDoc(this.docFactory.get(id));
    }

    return this.docs.get(id);
  }

  upsertDocData(id: string, data: IDocData) {
    // todo: continue here
    // we should create new docRef instance with updated data snapshot.
    // Seems that docRef could be not unique value as I thought before.
    if (!this.docs.has(id)) {
      this.registerDoc(this.docFactory.get(id, data));
    }
  }

  // in memory only so far
  // Creates subset of collection documents.
  query(options: IQueryOptions) {
    // todo: in future create QueryFactory which  should be injected in Collection
    return new Query(this, options);
  }

  sync(options: any): Sync {
    return new Sync(this, this.remoteStore);
  }

  onSnapshot(): Observable<Map<string, IDoc>> {
    return this.docs$;
  }

  private registerDoc(doc: IDoc) {
    // todo: need to subscribe to doc changes
    // doc.onSnapshot().pipe(
    //   takeUntil(doc.deleted$),
    // ).subscribe(
    //   () => {
    //     console.log(`doc updated`);
    //   },
    //   () => {
    //     // do nothing
    //   },
    //   () => {
    //     console.log(`doc was deleted`);
    //   },
    // );

    this.docs.set(doc.id, doc);
    (this.docs$ as BehaviorSubject<Map<string, IDoc>>).next(this.docs);
  }
}

// wrapper around Internal Collection
// which expose more API than client is needed
export class Collection implements ICollection {
  constructor(private internalCollection: InternalCollection) {
  }

  doc(name): IDoc {
    return this.internalCollection.doc(name);
  }

  // sync data with the pouch-db
  sync(options: any): Sync {
    return this.internalCollection.sync(options);
  }

  // in memory only so far
  query(options: IQueryOptions = {cached: false}) {
    return this.internalCollection.query(options);
  }
}
