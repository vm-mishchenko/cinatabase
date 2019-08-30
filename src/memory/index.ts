import {BehaviorSubject} from 'rxjs';
import {DocIdentificator} from '../manager/query';

class MemoryDocRef {
  private docIdentificator = new DocIdentificator(this.collectionId, this.docId);

  constructor(private collectionId: string, private docId: string, private memoryDb: MemoryDb) {
  }

  isExists() {
    return false;
  }

  set(newData: any) {
    this.memoryDb.setDoc(this.docIdentificator, newData);
  }

  update(newData: any) {
    this.memoryDb.updateDoc(this.collectionId, this.docId, newData);
  }

  snapshot() {
    return this.memoryDb.getDocSnapshot(this.collectionId, this.docId);
  }
}

class MemoryCollectionRef {
  constructor(private collectionId: string, private memoryDb: MemoryDb) {
  }

  doc(docId: string) {
    return new MemoryDocRef(this.collectionId, docId, this.memoryDb);
  }

  query() {
    return new MemoryQueryCollectionRef();
  }
}

class MemoryQueryCollectionRef {
  snapshot() {
    return [];
  }
}

export class MemoryDb {
  private collections: BehaviorSubject<Map<string, any>> = new BehaviorSubject<any>(new Map());

  setDoc(docIdentificator: DocIdentificator, newData: any) {
    const allCollections = this.collections.getValue();

    if (!allCollections.has(docIdentificator.collectionId)) {
      allCollections.set(docIdentificator.collectionId, new Map());
    }

    const collection = allCollections.get(docIdentificator.collectionId);

    collection.set(docIdentificator.docId, newData);

    this.collections.next(allCollections);
  }

  updateDoc(collectionId: string, docId: string, data: any) {
    const allCollections = this.collections.getValue();

    if (!allCollections.has(collectionId)) {
      allCollections.set(collectionId, new Map());
    }

    const collection = allCollections.get(collectionId);

    if (!collection.has(docId)) {
      collection.set(docId, {});
    }

    const previousDocData = collection.get(docId);
    const newDocData = {
      ...previousDocData,
      ...data
    };

    collection.set(docId, newDocData);

    this.collections.next(allCollections);
  }

  getDocSnapshot(collectionId: string, docId: string) {
    const allCollections = this.collections.getValue();
    const collection = allCollections.get(collectionId);

    return collection && collection.get(docId);
  }

  doc(collectionId: string, docId: string) {
    return new MemoryDocRef(collectionId, docId, this);
  }

  collection(collectionId: string) {
    return new MemoryCollectionRef(collectionId, this);
  }
}
