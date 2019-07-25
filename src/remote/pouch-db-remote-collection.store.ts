import { IRemoteCollectionStore } from '../interfaces';

export class PouchDbRemoteCollectionStore implements IRemoteCollectionStore {
  add(data: any): Promise<any> {
    return Promise.resolve();
  }
}
