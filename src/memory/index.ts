class MemoryDocRef {
  constructor(private id: string) {
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
}

class MemoryCollectionRef {
  constructor(private collectionId: string) {
  }

  doc(docId: string) {
    return new MemoryDocRef(docId);
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
  doc(id: string) {
    return new MemoryDocRef(id);
  }

  collection(collectionId: string) {
    return new MemoryCollectionRef(collectionId);
  }
}
