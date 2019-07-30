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
    xit('should return all docs', () => {
      const collection = db.collection('users');
      const query = collection.query({cached: true});

      query.onSnapshot().subscribe((docSnapshots) => {
        console.log(docSnapshots);
      });

      const docData = {test: 'foo'};

      return collection.doc('demo').update(docData).then(() => {
        return query.onSnapshot().subscribe((docs) => {
          console.log(docs);
          expect(docs instanceof Map);
          expect(docs.size).toEqual(1);
          expect(docs.get('demo')).toEqual(docData);
        });
      });
    });
  });
});
