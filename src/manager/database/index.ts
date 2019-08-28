import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {MutateServer} from '../mutate';
import {CollectionQuery, DocQuery} from '../query';
import {SyncServer} from '../sync';

export class DocRef {
  constructor(private collectionId: string,
              private docId: string,
              private syncServer: SyncServer,
              private mutateServer: MutateServer) {
  }

  sync(options?) {
    const docQuery = new DocQuery(this.collectionId, this.docId);

    return this.syncServer.syncDoc(docQuery, options);
  }

  // rewrite any previous values
  set(newData) {
    return this.mutateServer.setDocData(this.collectionId, newData);
  }

  // partial update
  update(newData) {
    return this.mutateServer.updateDocData(this.collectionId, newData);
  }
}

class CollectionQueryRef {
  constructor(private collectionId: string, private syncServer: SyncServer) {
  }

  where(key, comparison, value) {
    return this;
  }

  sync(options?: any) {
    // todo: need to implement
    const query = new CollectionQuery(this.collectionId, {});

    return this.syncServer.syncQuery(query, options);
  }
}

export class CollectionRef {
  constructor(private collectionId: string, private syncServer: SyncServer, private mutateServer: MutateServer) {
  }

  doc(docId: string) {
    return new DocRef(this.collectionId, docId, this.syncServer, this.mutateServer);
  }

  query() {
    return new CollectionQueryRef(this.collectionId, this.syncServer);
  }
}

export class DatabaseManager {
  private defaultCollectionId = 'DEFAULT_COLLECTION_ID';
  private syncServer = new SyncServer(this.memory, this.remote);
  private mutateServer = new MutateServer(this.memory, this.remote);

  constructor(private memory: MemoryDb, private remote: RemoteDb) {
  }

  doc(docId: string) {
    return new DocRef(this.defaultCollectionId, docId, this.syncServer, this.mutateServer);
  }

  collection(id) {
    return new CollectionRef(id, this.syncServer, this.mutateServer);
  }
}
