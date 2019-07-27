import { injectable } from 'inversify';
import 'reflect-metadata';
import { Subject } from 'rxjs';
import { Doc, MEMORY_STORE_TOKEN, REMOTE_STORE_TOKEN } from '..';
import { IMemoryDocStore, IMemoryStore } from '../interfaces';
import { FakeRemoteStore } from '../remote/test/fake-remote.store';
import { Database } from './database';

@injectable()
class FakeMemoryStoreFactory implements IMemoryStore {
  doc(name: string): IMemoryDocStore {
    return {
      update: (): Promise<any> => {
        return Promise.resolve();
      },

      get() {
        return Promise.resolve();
      },

      onSnapshot() {
        return new Subject();
      },
    };
  }
}

describe('Database', () => {
  it('should create database', () => {
    const services = new Map();
    services.set(REMOTE_STORE_TOKEN, FakeRemoteStore);

    expect(new Database({ services })).toBeTruthy();
  });

  it('should create doc', () => {
    const services = new Map();
    services.set(REMOTE_STORE_TOKEN, FakeRemoteStore);
    const db = new Database({ services });
    const doc = db.doc('test');

    expect(doc instanceof Doc).toBe(true);
  });

  it('should save doc in remote store', () => {
    const services = new Map();
    services.set(REMOTE_STORE_TOKEN, FakeRemoteStore);
    services.set(MEMORY_STORE_TOKEN, FakeMemoryStoreFactory);

    const db = new Database({ services });

    const memoryStoreFactory = db.injector.get<IMemoryStore>(MEMORY_STORE_TOKEN);

    spyOn(memoryStoreFactory, 'doc').and.callThrough();

    const doc = db.doc('test');

    doc.update({
      test: 'test',
    });

    expect(memoryStoreFactory.doc).toHaveBeenCalled();
  });
});
