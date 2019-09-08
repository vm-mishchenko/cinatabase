import {CollectionRef, DatabaseManager, DocRef} from './manager/database';
import {DocSnapshot, QuerySnapshot} from './manager/snapshot';
import {MemoryDb} from './memory';
import {InMemoryRemoteProvider, PouchDbRemoteProvider, RemoteDb} from './remote';

// PLAYGROUND
const memoryDb = new MemoryDb();
const remoteDb = new RemoteDb(new InMemoryRemoteProvider());
const databaseManager = new DatabaseManager(
  memoryDb,
  remoteDb
);

databaseManager;

export {
  MemoryDb,
  RemoteDb,
  DatabaseManager,
  InMemoryRemoteProvider,
  PouchDbRemoteProvider,
  DocRef,
  CollectionRef,
  DocSnapshot,
  QuerySnapshot
};
