export { Database } from './database';
export { Doc, IUpdateDocResult } from './document/doc';
export { DocFactory, DOC_FACTORY_TOKEN } from './document/doc.factory';
export { AkitaMemoryCollectionStore } from './memory/akita-memory-collection.store';
export { AkitaMemoryDocStore } from './memory/akita-memory-doc.store';
export { MEMORY_STORE_TOKEN, MemoryStore } from './memory/memory.store';
export { PouchDbRemoteCollectionStore } from './remote/pouch-db-remote-collection.store';
export { PouchDbRemoteDocStore } from './remote/pouch-db-remote-doc.store';
export { REMOTE_STORE_TOKEN, RemoteStoreFactory } from './remote/remote-store.factory';
export { IMediator, Mediator, MEDIATOR_TOKEN } from './mediator';
