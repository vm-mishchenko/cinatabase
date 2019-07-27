import { injectable } from 'inversify';
import { IRemoteDocRef, IRemoteStore } from '../../interfaces';
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

  docsCount(): number {
    return Object.keys(FakeRemoteStore.database.docs).length;
  }

  clearDatabase() {
    FakeRemoteStore.clearDatabase();
  }
}
