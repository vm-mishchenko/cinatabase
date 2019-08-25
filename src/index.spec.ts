import {Database} from './index';

describe('All tests so far', () => {
  it('playground', () => {
    const db = new Database();

    return db.collection('foo').get().then((data) => {
      expect(data.length).toEqual(2);
    });
  });

  it('should listen for snapshots', () => {
    const db = new Database();

    return db.collection('foo').onSnapshot((data) => {
      expect(data.length).toEqual(2);
    });
  });

  it('update', (done) => {
    const db = new Database();
    let snapshotCount = 0;

    db.collection('foo').onSnapshot((data) => {
      snapshotCount++;

      if (snapshotCount === 2) {
        expect(data.length).toEqual(3);
        done();
      }
    });

    db.collection('foo').update(15, {test: 'test'});
  });
});
