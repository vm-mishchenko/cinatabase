import 'reflect-metadata';
import {IDocData} from '../document/doc';
import {FakeRemoteStore} from '../remote/test/fake-remote.store';
import {Sync} from './sync';

class FakeCollection {
  upsertDocData(data: IDocData) {
  }
}


describe('Sync', () => {
  it('should add synced doc data to collection', () => {
    const collection = new FakeCollection();
    const remoteStore = new FakeRemoteStore();
    const sync = new Sync(collection as any, remoteStore);

    const remoteDocData = [
      {
        _id: '1',
        foo: 'foo'
      },
      {
        _id: '2',
        bar: 'bar'
      }
    ];

    const upsertDocDataCall = spyOn(collection, 'upsertDocData');
    spyOn(remoteStore, 'find').and.returnValue(Promise.resolve(remoteDocData));

    return sync.exec().then(() => {
      expect(upsertDocDataCall).toHaveBeenCalled();
      expect(upsertDocDataCall.calls.count()).toEqual(2);
    });

  });
});
