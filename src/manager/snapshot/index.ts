import {MemoryDb} from '../../memory';
import {RemoteDb} from '../../remote';
import {DocIdentificator} from '../query';
import {SyncServer} from '../sync';

export class SnapshotServer {
  private syncInProgress: Map<string, Promise<any>> = new Map();

  constructor(private memory: MemoryDb,
              private remoteDb: RemoteDb,
              private syncServer: SyncServer) {
  }

  docSnapshot(docIdentificator: DocIdentificator) {
    // check whether it was already synced
    if (this.syncServer.isIdentificatorSynced(docIdentificator)) {
      // return snapshot from the memory store
      return Promise.resolve(this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot());
    }

    // doc was not synced before, check maybe sync in progress
    if (!this.syncInProgress.has(docIdentificator.identificator)) {
      // starts sync doc
      const snapshotPromise = this.syncServer.syncDoc(docIdentificator).then(() => {
        return this.memory.doc(docIdentificator.collectionId, docIdentificator.docId).snapshot();
      });

      this.syncInProgress.set(docIdentificator.identificator, snapshotPromise);
    }

    return this.syncInProgress.get(docIdentificator.identificator);
  }
}
