import { Database, REMOTE_STORE_TOKEN } from '../../index';
import { FakeRemoteStore } from '../../remote/test/fake-remote.store';

export class TestDatabase extends Database {
  constructor() {
    const services = new Map();
    services.set(REMOTE_STORE_TOKEN, FakeRemoteStore);

    super({ services });
  }

  /**
   * Returns internal remote storage instance.
   */
  getRemoteStorage(): FakeRemoteStore {
    return this.injector.get<FakeRemoteStore>(REMOTE_STORE_TOKEN);
  }
}
