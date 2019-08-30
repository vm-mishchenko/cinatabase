class MemoryDocRef {
  constructor(private collectionId: string, private docId: string) {
  }

  isExists() {
    return false;
  }

  set(data) {
    console.log(`memory doc set data`);
  }

  update(data) {
    console.log(`memory doc update data`);
  }

  snapshot() {
    return {};
  }
}

class MemoryCollectionRef {
  constructor(private collectionId: string) {
  }

  doc(docId: string) {
    return new MemoryDocRef(this.collectionId, docId);
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
  doc(collectionId: string, docId: string) {
    return new MemoryDocRef(collectionId, docId);
  }

  collection(collectionId: string) {
    return new MemoryCollectionRef(collectionId);
  }
}
