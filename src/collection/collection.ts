import { BehaviorSubject, Observable } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { IDoc } from '../document/doc';
import { IDocFactory } from '../document/doc.factory';

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

//
export class InternalCollection {
  // already initialized documents
  docs: Map<string, IDoc> = new Map();
  docs$: Observable<Map<string, IDoc>> = new BehaviorSubject<Map<string, IDoc>>(new Map());

  constructor(
    private name: string,
    private docFactory: IDocFactory) {
  }

  doc(name): IDoc {
    if (!this.docs.has(name)) {
      const doc = this.docFactory.get(name);

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

      this.docs.set(name, doc);
      (this.docs$ as BehaviorSubject<Map<string, IDoc>>).next(this.docs);
    }

    return this.docs.get(name);
  }

  // in memory only so far
  query() {
    // todo: in future create QueryFactory which
    //  should be injected in Collection
    return new Query(this);
  }

  snapshot(): Map<string, IDoc> {
    return this.docs;
  }

  onSnapshot(): Observable<Map<string, IDoc>> {
    return this.docs$;
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

  // in memory only so far
  query() {
    return this.internalCollection.query();
  }
}
