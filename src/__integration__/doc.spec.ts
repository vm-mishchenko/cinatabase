import 'reflect-metadata';
import { TestDatabase } from '../document/test-helpers/fake-database';

// https://jestjs.io/docs/en/expect

/**
 * Tests high level integrations around Doc class.
 */
describe('Doc integration', () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = new TestDatabase();
  });

  afterEach(() => {
    db.getRemoteStorage().clearDatabase();
  });

  describe('[get method]', () => {
    it('should read from remote store initially', done => {
      const remoteGetResult = Promise.resolve({ remote: true });
      const fakeRemoteDoc = {
        get: jasmine.createSpy('remoteDoc.get').and.returnValue(remoteGetResult),
      };

      spyOn(db.getRemoteStorage(), 'doc').and.returnValue(fakeRemoteDoc);

      db.doc('test')
        .get()
        .then(() => {
          expect(fakeRemoteDoc.get).toHaveBeenCalled();
          done();
        });
    });

    it('should cache two identical get request promise', () => {
      const doc = db.doc('test');
      const firstGetPromise = doc.get();
      const secondGetPromise = doc.get();

      expect(firstGetPromise).toBe(secondGetPromise);
    });

    it('should read remote store once for few doc get request', done => {
      const remoteGetResult = Promise.resolve({ remote: true });
      const fakeRemoteDoc = {
        get: jasmine.createSpy('remoteDoc.get').and.returnValue(remoteGetResult),
      };
      spyOn(db.getRemoteStorage(), 'doc').and.returnValue(fakeRemoteDoc);

      const doc = db.doc('test');

      doc.get().then(() => {
        expect(fakeRemoteDoc.get).toHaveBeenCalled();

        doc.get().then(() => {
          expect(fakeRemoteDoc.get.calls.count()).toEqual(1);
          done();
        });
      });
    });

    it('should read remote store once for recreated doc get request', done => {
      const remoteGetResult = Promise.resolve({ remote: true });
      const fakeRemoteDoc = {
        get: jasmine.createSpy('remoteDoc.get').and.returnValue(remoteGetResult),
      };
      spyOn(db.getRemoteStorage(), 'doc').and.returnValue(fakeRemoteDoc);

      db.doc('test')
        .get()
        .then(() => {
          expect(fakeRemoteDoc.get).toHaveBeenCalled();

          db.doc('test')
            .get()
            .then(() => {
              expect(fakeRemoteDoc.get.calls.count()).toEqual(1);
              done();
            });
        });
    });
  });

  describe('[update method]', () => {
    it('should return previously updated value for the same doc', done => {
      const docName = 'test';
      const newData = { foo: 'foo' };
      const doc = db.doc(docName);

      doc
        .update(newData)
        .then(() => doc.get())
        .then(docData => {
          expect(docData).toEqual(newData);
          done();
        });
    });

    it('should return previously updated value for recreated doc', done => {
      const docName = 'test';
      const newData = { foo: 'foo' };

      db.doc(docName)
        .update(newData)
        .then(() => {
          // imitate that doc is created by some other client
          // in the same session
          return db.doc(docName).get();
        })
        .then(docData => {
          expect(docData).toEqual(newData);
          done();
        });
    });

    it('should update only subset of field not overriding all of them', done => {
      const doc = db.doc('test');

      doc
        .update({
          first: 'first',
          second: 'second',
        })
        .then(() => {
          return doc.update({
            first: 'foo',
          });
        })
        .then(() => doc.get())
        .then(docData => {
          expect(docData).toEqual({
            first: 'foo',
            second: 'second',
          });

          done();
        });
    });
  });

  describe('[onSnapshot method]', () => {
    it('should return initial document value', done => {
      db.doc('test')
        .onSnapshot()
        .subscribe(docSnapshot => {
          expect(docSnapshot).toEqual({});
          done();
        });
    });

    it('should return updated value', () => {
      const snapshotCallback = jest.fn();

      db.doc('test')
        .onSnapshot()
        .subscribe(snapshotCallback);

      const newData = {
        foo: 'foo',
      };

      return db
        .doc('test')
        .update(newData)
        .then(() => {
          expect(snapshotCallback.mock.calls.length).toEqual(2);
          expect(snapshotCallback).toHaveBeenLastCalledWith(newData);
        });
    });
  });
});
