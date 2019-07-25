import { EntityStore, Query } from '@datorama/akita';
import { IMemoryCollectionStore } from '../interfaces';

export class AkitaMemoryCollectionStore implements IMemoryCollectionStore {
  constructor(private collectionStore: EntityStore<any, any>, private collectionQuery: Query<any>) {}

  add(data: any): Promise<any> {
    return Promise.resolve();
  }
}
