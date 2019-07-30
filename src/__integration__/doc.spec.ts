import 'reflect-metadata';
import {TestDatabase} from '../database/test-helpers/fake-database';
import {DocSnapshot} from '../document/doc';
import {IRemoteDocData} from '../interfaces';

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
      const remoteGetResult = Promise.resolve({remote: true});
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
      const remoteGetResult = Promise.resolve({remote: true});
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
      const remoteGetResult = Promise.resolve({remote: true});
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

    it('should return document snapshot instance', () => {
      return db.doc('test').get().then((documentSnapshot) => {
        expect(documentSnapshot instanceof DocSnapshot).toBe(true);
      });
    });

    it('should return non existing doc snapshot', () => {
      return db.doc('test').get().then((documentSnapshot) => {
        expect(documentSnapshot.exists).toBe(false);
        expect(documentSnapshot.id).toBe('test');
        expect(documentSnapshot.toJSON()).toBe(undefined);
      });
    });

    it('should return existing doc snapshot', () => {
      const data: IRemoteDocData = {
        _id: 'test',
        foo: 'foo',
      };

      const remoteGetResult = Promise.resolve(data);
      const fakeRemoteDoc = {
        get: jasmine.createSpy('remoteDoc.get').and.returnValue(remoteGetResult),
      };

      spyOn(db.getRemoteStorage(), 'doc').and.returnValue(fakeRemoteDoc);

      return db.doc('test').get().then((documentSnapshot) => {
        expect(documentSnapshot.exists).toBe(true);
        expect(documentSnapshot.id).toBe('test');
        expect(documentSnapshot.toJSON()).toEqual({
          foo: 'foo',
        });
      });
    });
  });

  describe('[set method]', () => {
    it('should create new doc in remote storage', () => {
      const docRef = db.doc('test');
      const docData = {foo: 'foo'};

      return docRef.set(docData).then(() => {
        return db.getRemoteStorage().doc('test').get().then((remoteDocData) => {
          expect(docData).toEqual(remoteDocData);
        });
      });
    });

    it('should return newly created snapshot', () => {
      const docRef = db.doc('test');
      const docData = {foo: 'foo'};

      return docRef.set(docData).then(() => {
        return docRef.get().then((docSnapshot) => {
          expect(docData).toEqual(docSnapshot.toJSON());
        });
      });
    });

    it('should override already existed doc data in remote store', () => {
      db.getRemoteStorage().addDoc('test', {foo: 'bar'});
      const docRef = db.doc('test');
      const docData = {foo: 'foo'};

      return docRef.set(docData).then(() => {
        return db.getRemoteStorage().doc('test').get().then((remoteDocData) => {
          expect(docData).toEqual(remoteDocData);
        });
      });
    });

    it('should override already existed doc data and return snapshot', () => {
      db.getRemoteStorage().addDoc('test', {foo: 'bar'});
      const docRef = db.doc('test');
      const docData = {foo: 'foo'};

      return docRef.set(docData).then(() => {
        return docRef.get().then((docSnapshot) => {
          expect(docData).toEqual(docSnapshot.toJSON());
        });
      });
    });
  });

  describe('[update method]', () => {
    it('should return error for non-existing doc', (done) => {
      db.doc('test').update({}).catch(() => {
        done();
      });
    });

    it('should update and read doc data', () => {
      // add doc to remote database
      db.getRemoteStorage().addDoc('test', {});

      const newData = {foo: 'foo'};
      const doc = db.doc('test');

      return doc
        .update(newData)
        .then(() => doc.get())
        .then((docSnapshot) => {
          expect(docSnapshot.toJSON()).toEqual(newData);
        });
    });

    it('should return previously updated value for recreated doc', () => {
      // add doc to remote database
      db.getRemoteStorage().addDoc('test', {});

      const newData = {foo: 'foo'};

      return db.doc('test')
        .update(newData)
        .then(() => db.doc('test').get())
        .then((docSnapshot) => {
          expect(docSnapshot.toJSON()).toEqual(newData);
        });
    });

    it('should update only subset of field not overriding all of them', () => {
      db.getRemoteStorage().addDoc('test', {});

      const doc = db.doc('test');

      return doc
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
        .then((docSnapshot) => {
          expect(docSnapshot.toJSON()).toEqual({
            first: 'foo',
            second: 'second',
          });
        });
    });
  });

  describe('[onSnapshot method]', () => {
    it('should return doc snapshot instance', () => {
      return db.doc('test')
        .onSnapshot((docSnapshot) => {
          expect(docSnapshot instanceof DocSnapshot).toBe(true);
        });
    });

    it('should return non-existing doc snapshot', () => {
      return db.doc('test')
        .onSnapshot((docSnapshot) => {
          expect(docSnapshot.exists).toBe(false);
        });
    });

    it('should return existing doc snapshot', () => {
      // add doc to remote database
      const docData = {foo: 'foo'};
      db.getRemoteStorage().addDoc('test', docData);

      return db.doc('test')
        .onSnapshot((docSnapshot) => {
          expect(docSnapshot.exists).toEqual(true);
          expect(docSnapshot.toJSON()).toEqual(docData);
        });
    });

    it('should return updated value', () => {
      // add doc to remote database
      const initialData = {
        foo: 'foo',
      };
      db.getRemoteStorage().addDoc('test', initialData);
      const snapshotCallback = jest.fn();

      db.doc('test')
        .onSnapshot(snapshotCallback);

      const updatedData = {
        foo: 'foo',
      };

      return db
        .doc('test')
        .update(updatedData)
        .then(() => {
          expect(snapshotCallback.mock.calls.length).toEqual(2);

          const initialSnapshot = snapshotCallback.mock.calls[0][0];
          const updatedSnapshot = snapshotCallback.mock.calls[1][0];

          expect(initialSnapshot instanceof DocSnapshot).toBe(true);
          expect(updatedSnapshot instanceof DocSnapshot).toBe(true);
          expect(initialSnapshot.toJSON()).toEqual(initialData);
          expect(updatedSnapshot.toJSON()).toEqual(updatedData);
        });
    });
  });
});
