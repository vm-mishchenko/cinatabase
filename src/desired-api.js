const db = new Database();

// returns un-synced (without data) document
db.doc('user');

// create doc in 'hidden' base collection if does not exists and get data
db.doc('user').get();

// @return {!View}
db.doc('user').onSnapshot();

// create or point to admin document
db.collection('users').doc('admin');

// create new document with auto generated id.
db.collection('users').doc();

/*
 * Use cases
 * 1. sync documents
 * 2. build query based on in memory documents
 * 3. build query and fetch data from pouch-db
 * */

// load users based on the options from pouch-db
// @return {!Sync}
const sync = db.collection('users')
  .sync(/*...options*/)
  .exec();

// creates query object, does not perform any action yet
// @return {!Query}
const query = db
  .collection('users')
  .query({
    sync: true, // before query sync documents with pouch-db
  });

// load users based on the options from pouch-db
// @return {!Query}
query.get();

// return all documents
query.snapshot().then(docs => {
});

// listen for document changes
// @return {DocumentData}
query.onSnapshot();

// update field for all documents in the query
query.update({});
