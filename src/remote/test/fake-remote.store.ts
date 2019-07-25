import { injectable } from 'inversify';
import { IRemoteCollectionStore, IRemoteDocStore, IStore } from '../../interfaces';
import { FakeRemoteDoc } from './fake-remote-doc';

@injectable()
export class FakeRemoteStore implements IStore {
  static clearDatabase = () => {
    FakeRemoteStore.database.docs = {};
    FakeRemoteStore.database.collections = {};
  };

  private static database = {
    docs: {},
    collections: {},
  };

  doc(name: string): IRemoteDocStore {
    return new FakeRemoteDoc(name, FakeRemoteStore.database);
  }

  collection(name: string): IRemoteCollectionStore {
    return {
      add(data: any): Promise<any> {
        return Promise.resolve();
      },
    };
  }

  docsCount(): number {
    return Object.keys(FakeRemoteStore.database.docs).length;
  }

  clearDatabase() {
    FakeRemoteStore.clearDatabase();
  }
}
