import {CollectionRef, DatabaseManager, DocRef} from './manager';
import {MemoryDb} from './memory';
import {InMemoryRemoteProvider, PouchDbRemoteProvider, RemoteDb} from './remote';
import {DocSnapshot, QuerySnapshot} from './snapshot';
import {IDocSnapshot, IQuerySnapshot} from './snapshot/interfaces';

// PLAYGROUND
const memoryDb = new MemoryDb();
const remoteDb = new RemoteDb(new InMemoryRemoteProvider());
const databaseManager = new DatabaseManager(
  memoryDb,
  remoteDb
);

export {
  MemoryDb,
  RemoteDb,
  DatabaseManager,
  InMemoryRemoteProvider,
  PouchDbRemoteProvider,
  DocRef,
  CollectionRef,
  DocSnapshot,
  QuerySnapshot,
  IDocSnapshot,
  IQuerySnapshot
};
