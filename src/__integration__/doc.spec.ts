import 'reflect-metadata';
import { Database } from '../database';
import { REMOTE_STORE_TOKEN } from '../remote/remote-store.factory';
import { FakeRemoteStore } from '../remote/test/fake-remote.store';

class TestDatabase extends Database {
  constructor() {
    const services = new Map();
    services.set(REMOTE_STORE_TOKEN, FakeRemoteStore);

    super({ services });
  }

  /**
   * Returns internal remote storage instance.
   */
  getRemoteStorage(): FakeRemoteStore {
    return this.injector.get<FakeRemoteStore>(REMOTE_STORE_TOKEN);
  }
}

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

  describe('[get]', () => {
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

  describe('[update]', () => {
    it('should return previously updated value for the same doc', done => {
      const docName = 'test';
      const newData = { foo: 'foo' };
      const doc = db.doc(docName);

      doc
        .update(newData)
        .result.then(() => doc.get())
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
        .result.then(() => {
          // imitate that doc is created by some other client
          // in the same session
          return db.doc(docName).get();
        })
        .then(docData => {
          expect(docData).toEqual(newData);
          done();
        });
    });
  });
});
