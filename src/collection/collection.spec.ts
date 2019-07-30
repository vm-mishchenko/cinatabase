import 'reflect-metadata';
import {Doc} from '..';
import {TestDatabase} from '../database/test-helpers/fake-database';
import {Collection} from './collection';

describe('Collection', () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = new TestDatabase();
  });

  afterEach(() => {
    db.getRemoteStorage().clearDatabase();
  });

  describe('[doc method]', () => {
    it('should return doc reference', () => {
      const users = db.collection('users');
      const demoDocRef = users.doc('demo');

      expect(demoDocRef instanceof Doc);
    });

    it('should return the same doc reference', () => {
      const users = db.collection('users');
      const firstDemoDocRef = users.doc('demo');
      const secondDemoDocRef = users.doc('demo');

      expect(firstDemoDocRef).toBe(secondDemoDocRef);
    });
  });

  describe('[query method]', () => {
    // todo: need to fix it somehow, broken after doc was changed to doc-ref
    describe('[get method]', () => {
      it('should return docs snapshot', () => {
        const collection = db.collection('users');

        collection.doc('firstDoc').set({firstDoc: 'firstDoc'}).then(() => {
          const query = collection.query({cached: true});

          return query.get().then((querySnapshots) => {
            const firstDocSnapshot = querySnapshots.docSnapshots[0];
            expect(firstDocSnapshot.id).toEqual('firstDoc');
            expect(firstDocSnapshot.exists).toEqual(true);
            expect(firstDocSnapshot.toJSON()).toEqual({firstDoc: 'firstDoc'});
          });
        });
      });

      it('should return newly added doc', () => {
        const collection = db.collection('users');

        return collection.doc('firstDoc').set({firstDoc: 'firstDoc'}).then(() => {
          const query = collection.query({cached: true});

          return query.get().then((querySnapshots) => {
            const firstDocSnapshot = querySnapshots.docSnapshots[0];
            expect(firstDocSnapshot.id).toEqual('firstDoc');
            expect(firstDocSnapshot.exists).toEqual(true);
            expect(firstDocSnapshot.toJSON()).toEqual({firstDoc: 'firstDoc'});

            // add new doc to collection
            return collection.doc('secondDoc').set({secondDoc: 'secondDoc'}).then(() => {
              return query.get().then((newQuerySnapshot) => {
                const secondDocSnapshot = newQuerySnapshot.docSnapshots[1];
                expect(secondDocSnapshot.id).toEqual('secondDoc');
                expect(secondDocSnapshot.exists).toEqual(true);
                expect(secondDocSnapshot.toJSON()).toEqual({secondDoc: 'secondDoc'});
              });
            });
          });
        });
      });


    });
  });
});
