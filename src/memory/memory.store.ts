import { EntityStore, Query, Store } from '@datorama/akita';
import { injectable } from 'inversify';
import { IMemoryCollectionStore, IMemoryDocStore, IMemoryStore } from '../interfaces';
import { AkitaMemoryCollectionStore } from './akita-memory-collection.store';
import { AkitaMemoryDocStore } from './akita-memory-doc.store';

export const MEMORY_STORE_TOKEN = Symbol.for('MEMORY_STORE_TOKEN');

@injectable()
export class MemoryStore implements IMemoryStore {
  /**
   * Stores already initialized docs for not loosing already
   * loaded data from remote store.
   */
  private docCache: Map<string, IMemoryDocStore> = new Map();

  doc(name: string): IMemoryDocStore {
    if (!this.docCache.has(name)) {
      const docStore = new Store(
        {},
        {
          name,
        },
      );

      const memoryDoc = new AkitaMemoryDocStore(docStore, new Query(docStore));

      this.docCache.set(name, memoryDoc);
    }

    return this.docCache.get(name);
  }

  collection(name: string): IMemoryCollectionStore {
    const collectionStore = new EntityStore(
      {},
      {
        name,
      },
    );

    return new AkitaMemoryCollectionStore(collectionStore, new Query(collectionStore));
  }
}
