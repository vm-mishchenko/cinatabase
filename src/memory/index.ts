import {BehaviorSubject} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {DocIdentificator, IQueryRequest} from '../query';
import {DocSnapshot, QuerySnapshot} from '../snapshot';
import {IQuerySnapshot} from '../snapshot/interfaces';
import {IMemoryCollectionRef, IMemoryDocRef, IMemoryQueryCollectionRef} from './interfaces';

class MemoryDocRef<IDoc> implements IMemoryDocRef<IDoc> {
  private docIdentificator = new DocIdentificator(this.collectionId, this.docId);

  constructor(private collectionId: string, private docId: string, private memoryDb: MemoryDb) {
  }

  isExists() {
    return this.memoryDb.isDocExist(this.docIdentificator);
  }

  set(newData: IDoc) {
    this.memoryDb.setDoc(this.docIdentificator, newData);
  }

  update(newData: Partial<IDoc>) {
    this.memoryDb.updateDoc(this.collectionId, this.docId, newData);
  }

  remove() {
    this.memoryDb.removeDoc(this.collectionId, this.docId);
  }

  snapshot() {
    return this.memoryDb.getDocSnapshot<IDoc>(this.collectionId, this.docId);
  }

  onSnapshot() {
    return this.memoryDb.getDocOnSnapshot(this.collectionId, this.docId);
  }
}

class MemoryCollectionRef<IDoc> implements IMemoryCollectionRef<IDoc> {
  constructor(readonly collectionId: string, private memoryDb: MemoryDb) {
  }

  foo(foo: IDoc): IDoc {
    return foo;
  }

  doc(docId: string) {
    return new MemoryDocRef<IDoc>(this.collectionId, docId, this.memoryDb);
  }

  query(queryRequest?: IQueryRequest) {
    return new MemoryQueryCollectionRef<IDoc>(this.collectionId, queryRequest, this.memoryDb);
  }
}

class MemoryQueryCollectionRef<IDoc> implements IMemoryQueryCollectionRef<IDoc> {
  constructor(private collectionId: string,
              private queryRequest: IQueryRequest,
              private memoryDb: MemoryDb) {
  }

  snapshot() {
    return this.memoryDb.getQuerySnapshot<IDoc>(this.collectionId, this.queryRequest);
  }

  onSnapshot() {
    return this.memoryDb.getOnQuerySnapshot(this.collectionId, this.queryRequest);
  }
}

class MemoryCollection {
  private internalDocs: BehaviorSubject<Map<string, any>> = new BehaviorSubject(new Map());

  // todo: find the way do fix it
  // tslint:disable-next-line:member-ordering
  readonly changes$ = this.internalDocs.asObservable().pipe(
    shareReplay(1)
  );

  set(docId: string, data: any) {
    const docs = this.internalDocs.getValue();

    this.internalDocs.next(new Map(docs).set(docId, data));
  }

  get(docId: string) {
    return this.internalDocs.getValue().get(docId);
  }

  has(docId: string) {
    return this.internalDocs.getValue().has(docId);
  }

  remove(docId: string) {
    const docs = this.internalDocs.getValue();

    docs.delete(docId);

    this.internalDocs.next(new Map(docs));
  }

  removeAll() {
    this.internalDocs.next(new Map());
  }

  docs() {
    return this.internalDocs.getValue();
  }
}

export class MemoryDb {
  private innerCollections: Map<string, MemoryCollection> = new Map();

  doc(collectionId: string, docId: string) {
    return new MemoryDocRef(collectionId, docId, this);
  }

  collection<IDoc>(collectionId: string) {
    return new MemoryCollectionRef<IDoc>(collectionId, this);
  }

  collections() {
    return Array.from(this.innerCollections.keys()).map((collectinId) => {
      return this.collection(collectinId);
    });
  }

  // todo: should be hidden later under the internal API
  setDoc(docIdentificator: DocIdentificator, newData: any) {
    if (!this.innerCollections.has(docIdentificator.collectionId)) {
      this.innerCollections.set(docIdentificator.collectionId, new MemoryCollection());
    }

    const collection = this.innerCollections.get(docIdentificator.collectionId);

    collection.set(docIdentificator.docId, newData);
  }

  updateDoc(collectionId: string, docId: string, data: any) {
    if (!this.innerCollections.has(collectionId)) {
      this.innerCollections.set(collectionId, new MemoryCollection());
    }

    const collection = this.innerCollections.get(collectionId);
    const previousDocData = collection.get(docId) || {};
    const newDocData = {
      ...previousDocData,
      ...data
    };

    collection.set(docId, newDocData);
  }

  removeDoc(collectionId: string, docId: string) {
    if (!this.innerCollections.has(collectionId)) {
      return;
    }

    const collection = this.innerCollections.get(collectionId);

    return collection && collection.remove(docId);
  }

  getDocSnapshot<IDoc>(collectionId: string, docId: string) {
    const collection = this.innerCollections.get(collectionId);

    return new DocSnapshot<IDoc>(docId, collection && collection.get(docId));
  }

  getDocOnSnapshot(collectionId: string, docId: string) {
    if (!this.innerCollections.has(collectionId)) {
      this.innerCollections.set(collectionId, new MemoryCollection());
    }

    const collection = this.innerCollections.get(collectionId);

    return collection.changes$.pipe(
      map(() => this.getDocSnapshot(collectionId, docId))
    );
  }

  getQuerySnapshot<IDoc>(collectionId: string, queryRequest: IQueryRequest): IQuerySnapshot<IDoc> {
    if (!this.innerCollections.has(collectionId)) {
      return new QuerySnapshot([]);
    }

    // todo: apply queryRequest
    const docs = Array.from(this.innerCollections.get(collectionId).docs()).map(([id, docData]) => {
      return new DocSnapshot(id, docData);
    });

    return new QuerySnapshot<IDoc>(docs);
  }

  getOnQuerySnapshot(collectionId: string, queryRequest: IQueryRequest) {
    if (!this.innerCollections.has(collectionId)) {
      this.innerCollections.set(collectionId, new MemoryCollection());
    }

    const collection = this.innerCollections.get(collectionId);

    return collection.changes$.pipe(
      map(() => this.getQuerySnapshot(collectionId, queryRequest))
    );
  }

  isDocExist(docIdentificator: DocIdentificator) {
    const collection = this.innerCollections.get(docIdentificator.collectionId);

    return Boolean(collection && collection.get(docIdentificator.docId));
  }

  removeAllData() {
    // it's important to keep collection instance, since it stores the client's subscription
    Array.from(this.innerCollections.values()).forEach((collection) => {
      collection.removeAll();
    });
  }
}
