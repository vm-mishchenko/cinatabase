import {DatabaseManager} from './manager/database';
import {MemoryDb} from './memory';
import {RemoteDb} from './remote';

// CLIENT
const memoryDb = new MemoryDb();
const remoteDb = new RemoteDb();
const databaseManager = new DatabaseManager(
  memoryDb,
  remoteDb
);

// use case 1: sync doc from remote to memory dbs
databaseManager.doc('admin').sync().then(() => {
  console.log(`synced`);
});

export {
  MemoryDb,
  RemoteDb,
  DatabaseManager
};

// use case 1.1: two identical parallel sync request, one one should be executed
const sync1 = databaseManager.doc('admin').sync();
const sync2 = databaseManager.doc('admin').sync();
Promise.all([
  sync1,
  sync2
]).then(() => {
  console.log(`Double synced`);
});

// use case 2: sync doc from the collection
/*databaseManager.collection('users').doc('admin').sync().then(() => {
  console.log(`synced`);
});*/

// use case 2.1: should not call remote server for the sync if it's already synced
/*const initialSync = databaseManager.collection('users').doc('admin').sync();
initialSync.then(() => {
  databaseManager.collection('users').doc('admin').sync().then(() => {
    console.log('synced');
  });
});*/

// use case 3: sync collection subset
/*databaseManager.collection('users')
  .query().where('parent', '=', null)
  .sync().then(() => {
  console.log(`collection query synced`);
});*/

// use case 4: mutate doc
/*databaseManager.doc('admin').update({}).then(() => {
  console.log(`updated`);
});*/

