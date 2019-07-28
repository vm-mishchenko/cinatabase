import { BehaviorSubject, Observable } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { IDoc } from '../document/doc';
import { IDocFactory } from '../document/doc.factory';
import { IRemoteStore } from '../interfaces';

/**
 * Document data (for use with `DocumentReference.set()`) consists of fields
 * mapped to values.
 */
export interface IDocumentData {
  [field: string]: any;
}

/**
 * A `DocumentSnapshot` contains data read from a document in your Firestore
 * database. The data can be extracted with `.data()` or `.get(<field>)` to
 * get a specific field.
 */
export interface IDocumentSnapshot {
  /**
   * Retrieves all fields in the document as an Object. Returns 'undefined' if
   * the document doesn't exist.
   */
  data(): IDocumentData;

  get(fieldPath: string): any;
}

/**
 * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
 * representing the results of a query. The documents can be accessed as an
 * array via the `docs` property or enumerated using the `forEach` method. The
 * number of documents can be determined via the `empty` and `size`
 * properties.
 */
export interface IQuerySnapshot {
  /**
   * Enumerates all of the documents in the QuerySnapshot.
   *
   * @param callback A callback to be called with a `QueryDocumentSnapshot` for
   * each document in the snapshot.
   * @param thisArg The `this` binding for the callback.
   */
  forEach(callback: (result: IDocumentSnapshot) => void, thisArg?: any): void;
}

export interface IQuery {
  onSnapshot(): IQuerySnapshot;
}

export interface ICollection {
  doc(name: string): IDoc;

  // todo: add interface
  query(): Query;

  sync(options: any): Sync;
}

/**
 * Load document data from the pouch-db.
 * Knows how to construct request query to based on the options.
 * Operates on document data level not in IDoc level.
 */
export class Sync {
  constructor(private internalCollection: InternalCollection,
              private remoteStore: IRemoteStore,
              private  options: any) {
  }

  // execute synchronization
  exec(): Promise<any> {
    return this.remoteStore.find({}).then((docsData) => {
      docsData.forEach((docData) => {
        const { _id, ...data } = docData;

        this.internalCollection.addSyncedDoc(_id, data);
      });
    });
  }
}

// todo: add interface
export class Query {
  private docs$: Observable<Map<string, IDoc>> = this.internalCollection.onSnapshot();
  private docsSnapshot: Observable<Map<string, any>> = this.internalCollection.onSnapshot().pipe(
    map((docs) => {
      return Array.from(docs.entries()).reduce((result, [docName, doc]) => {
        result.set(docName, doc.snapshot());

        return result;
      }, new Map());
    }),
  );

  constructor(private internalCollection: InternalCollection) {
  }

  onSnapshot(): Observable<Map<string, any>> {
    return this.docsSnapshot;
  }
}

export class InternalCollection {
  // already initialized documents
  private docs: Map<string, IDoc> = new Map();
  private docs$: Observable<Map<string, IDoc>> = new BehaviorSubject<Map<string, IDoc>>(new Map());

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

  addSyncedDoc(id: string, data: any) {
    if (!this.docs.has(id)) {
      this.registerDoc(this.docFactory.get(id, data));
    }
  }

  // in memory only so far
  query() {
    // todo: in future create QueryFactory which  should be injected in Collection
    return new Query(this);
  }

  sync(options: any): Sync {
    return new Sync(this, this.remoteStore, options);
  }

  snapshot(): Map<string, IDoc> {
    return this.docs;
  }

  onSnapshot(): Observable<Map<string, IDoc>> {
    return this.docs$;
  }

  private registerDoc(doc: IDoc) {
    doc.onSnapshot().pipe(
      takeUntil(doc.deleted$),
    ).subscribe(
      () => {
        console.log(`doc updated`);
      },
      () => {
        // do nothing
      },
      () => {
        console.log(`doc was deleted`);
      },
    );

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
  query() {
    return this.internalCollection.query();
  }
}
