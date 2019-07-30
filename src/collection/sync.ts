import {IRemoteStore} from '../interfaces';
import {InternalCollection} from './collection';

/**
 * Load document data from the remote database.
 * Knows how to construct request query to based on the options.
 * Operates on document data level not in IDoc level.
 */
export class Sync {
  constructor(private internalCollection: InternalCollection,
              private remoteStore: IRemoteStore) {
  }

  // execute synchronization
  exec(): Promise<any> {
    return this.remoteStore.find({}).then((docsData) => {
      docsData.forEach((docData) => {
        const {_id, ...data} = docData;

        this.internalCollection.upsertDocData(_id, data);
      });
    });
  }
}

