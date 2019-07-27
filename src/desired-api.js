const db = new Database();

// returns un-synced (without data) document
db.doc('user');

// create doc in 'hidden' base collection if does not exists and get data
db.doc('user').get();

// @return {!View}
db.doc('user').onSnapshot();

// create or point to admin document
db.collection('users').doc('admin');

// create new document
db.collection('users').doc();

// load all users from remote
db.collection('users').onSnapshot();

// show only loaded users, does not trigger additional loading
db.collection('users').onSnapshot({ memoryOnly: true });

// load users based on the predicate
findPredicate = (doc) => doc;
const usersNameView = db.collection('users').find(findPredicate);
