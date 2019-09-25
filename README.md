Handles the interaction between memory and persistent databases.

# Goal
Let's imaging your app has a memory database/store which serves as a source for your UI and 
persistent database (indexdb, server, etc.) where you store data between sessions. There 
are a few typical tasks that you have to handle: 
- partially sync both dbs 
- and make sure that dbs are consistent after mutation

The modern "redux"-like approach suggests to create actions, reducers, saga, effects and
all kind of other abstractions that your framework ecosystem has. That's fine and in most 
cases straightforward but quite verbose as for me.

So I created this lib (better to say the draft of the lib) which tries to hide all tedious 
tasks under the hood providing for the client clean and pretty API.

## Main idea
I will start from the high-level API and move further to more tiny details.

#####  Doc and collection
Everything is tied around two main entities - `Doc` and `Collection`. That's the most high level
API which the end-user will use eventually.

```javascript
// get reference to users collection
const users = databaseManager.collection<{name: string}>('users');

// take one particular user
const admin = users.doc('admin');

// get user data
admin.snapshot().then((adminSnapshot) => {
    adminSnapshot.data()
});
```

#####  Database manager
The next one is `Database Manager` which takes Memory and Remote dbs as parameter and control
their interactions. Most likely you will have only one manager instance per app.
```javascript
const memoryDb = new MemoryDb();
const remoteDb = new RemoteDb(new InMemoryRemoteProvider());
const databaseManager = new DatabaseManager(
  memoryDb,
  remoteDb
);
```

#####  Memory and Remote dbs

Ok, let's move to `Memory` and `Remote` dbs.
To make life easier for the Manager they both should mimic almost the same API as Database Manager itself. 
```javascript
const memoryDb = new MemoryDb();

const memoryUsers = memoryDb.collection('users');
const adminSnapshot = memoryUsers.doc('admin').snapshot();

adminSnapshot.data();
```

```javascript
const removeDb = new MemoryDb(new InMemoryRemoteProvider());

const remoteUsers = removeDb.collection('users');

remoteUsers.doc('admin').snapshot().then((adminSnapshot) => {
    adminSnapshot.data();
})
```

Remote db takes `provider` as the argument which eventually decides where the data should be stored.
Currently, I added PouchDb provider to store data locally in IndexDb and Memory provider for the unit tests.

#####  Internal implementation

Manager spreads the actual work between different entities. 
- Sync server
- Mutate server
- Snapshot server

So eventually the main idea is that the client could interact with Manager in two dimensions. 
Using `doc` and `collection` to manage data. 
And communicate with a particular server to manage the logic of data flow.

### Examples
Let's consider some typical workflow. Client wants to load sub-set of docs to show them initially.
As user interacts with the app we want to sync additional set of docs. And somewhere in between client wants to update some docs.

##### Initial sync
```javascript
const users = dbManager.collection('users');

// remote -> memory sync users from particular country
users.query({
 country: 'foo' 
}).sync().then(() => {
  // done    
});
```

##### Render all users that were synced
```javascript
const users = dbManager.collection('users');

// render synced users
users.query().onSnapshot({
  source: 'memory' // run query against memory db only
}).subscribe((syncedUsers) => {
  // render users
});
```

##### Sync additional subset of users
After success sync previous subscription receive users from both countries.
```javascript
const users = dbManager.collection('users');

users.query({
 country: 'bar' 
}).sync().then(() => {
  // done
});
```

##### Get specific user and update it
```javascript
const users = dbManager.collection('users');
const admin = users.doc('admin');

admin.isExists().then(() => {
    // admin exist, let's update it
    admin.update({
      country: 'bar'
    }).then(() => {
        // done
    });
}).catch(() => {
    // admin does not exist, let's create it
    admin.set({
          country: 'bar'
        }).then(() => {
            // done
        });
});
```
