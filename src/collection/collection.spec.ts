import 'reflect-metadata';
import { TestDatabase } from '../document/test-helpers/fake-database';
import { Collection } from './collection';

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

      expect(demoDocRef instanceof Collection);
    });

    it('should return the same doc reference', () => {
      const users = db.collection('users');
      const firstDemoDocRef = users.doc('demo');
      const secondDemoDocRef = users.doc('demo');

      expect(firstDemoDocRef).toBe(secondDemoDocRef);
    });
  });

  describe('[query method]', () => {
    fit('should return docs', () => {
      const collection = db.collection('users');
      collection.doc('demo');

      const query = collection.query();
      query.onSnapshot().subscribe((docs) => {
        console.log(docs);
      });
    });
  });
});
