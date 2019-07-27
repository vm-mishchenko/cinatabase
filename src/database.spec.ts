import { injectable } from 'inversify';
import 'reflect-metadata';
import { Subject } from 'rxjs';
import { Database } from './database';
import { Doc } from './document/doc';
import { IMemoryDocStore, IMemoryStore } from './interfaces';
import { MEMORY_STORE_TOKEN } from './memory/memory.store';

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
      }
    };
  }
}

describe('Database', () => {
  it('should create database', () => {
    expect(new Database()).toBeTruthy();
  });

  it('should create doc', () => {
    const db = new Database();
    const doc = db.doc('test');

    expect(doc instanceof Doc).toBe(true);
  });

  it('should save doc in remote store', () => {
    const services = new Map();
    services.set(MEMORY_STORE_TOKEN, FakeMemoryStoreFactory);

    const db = new Database({ services });

    const memoryStoreFactory = db.injector.get<IMemoryStore>(MEMORY_STORE_TOKEN);

    spyOn(memoryStoreFactory, 'doc').and.callThrough();

    const doc = db.doc('test');

    doc.update({
      test: 'test'
    });

    expect(memoryStoreFactory.doc).toHaveBeenCalled();
  });
});
