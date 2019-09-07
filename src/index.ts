import {CollectionRef, DatabaseManager, DocRef} from './manager/database';
import {DocSnapshot, QuerySnapshot} from './manager/snapshot';
import {MemoryDb} from './memory';
import {InMemoryRemoteProvider, PouchDbRemoteProvider, RemoteDb} from './remote';

// CLIENT
const memoryDb = new MemoryDb();
const remoteDb = new RemoteDb(new InMemoryRemoteProvider());
const databaseManager = new DatabaseManager(
  memoryDb,
  remoteDb
);

// use case 1: sync doc from remote to memory dbs
/*databaseManager.doc('admin').sync().then(() => {
  console.log(`synced`);
});*/

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

// use case 1.1: two identical parallel sync request, one one should be executed
/*const sync1 = databaseManager.doc('admin').sync();
const sync2 = databaseManager.doc('admin').sync();
Promise.all([
  sync1,
  sync2
]).then(() => {
  console.log(`Double synced`);
});*/

// use case 2: sync doc from the collection
/*databaseManager.collection('users').doc('admin').sync().then(() => {
  console.log(`synced`);
});*/

// use case 2.1: should not call remote server for the sync if query or doc was previously synced
// const initialSync = databaseManager.collection('users').doc('admin').sync();
// initialSync.then(() => {
//   databaseManager.collection('users').doc('admin').sync().then(() => {
//     console.log('synced');
//   });
// });

// use case 2.2: force to sync even if query or doc was previously synced
/*const initialSync = databaseManager.collection('users').doc('admin').sync();
initialSync.then(() => {
  databaseManager.collection('users').doc('admin').sync({force: true}).then(() => {
    console.log('synced');
  });
});*/

// use case 3: sync collection subset
/*databaseManager.collection('users')
  .query().where('parent', '=', null)
  .sync().then(() => {
  console.log(`collection query synced`);
});*/

// use case 5: get document, automatically sync if it was not before
/*databaseManager.doc('123').snapshot().then((data) => {
  console.log(data);
});*/

// use case 5.1: should sync only once, for the first snapshot
/*databaseManager.doc('123').snapshot().then(() => {
  databaseManager.doc('123').snapshot().then(() => {
    console.log(`data`);
  });
});*/

// use case 6.1: should create doc or rewrite in case if it's already exist
/*databaseManager.collection('users').doc('foo').set({}).then(() => {
  console.log(`set is done`);
});*/
