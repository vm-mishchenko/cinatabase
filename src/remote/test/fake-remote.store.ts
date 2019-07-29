import { injectable } from 'inversify';
import { IRemoteDocData, IRemoteDocRef, IRemoteStore } from '../../interfaces';
import { FakeRemoteDoc } from './fake-remote-doc';

@injectable()
export class FakeRemoteStore implements IRemoteStore {
  static clearDatabase = () => {
    FakeRemoteStore.database.docs = {};
    FakeRemoteStore.database.collections = {};
  };

  private static database = {
    docs: {},
    collections: {},
  };

  doc(name: string): IRemoteDocRef {
    return new FakeRemoteDoc(name, FakeRemoteStore.database);
  }

  find(options: any): Promise<IRemoteDocData[]> {
    return Promise.resolve([]);
  }

  addDoc(id, data) {
    FakeRemoteStore.database.docs[id] = {
      _id: id,
      ...data,
    };
  }

  docsCount(): number {
    return Object.keys(FakeRemoteStore.database.docs).length;
  }

  clearDatabase() {
    FakeRemoteStore.clearDatabase();

  }
}
