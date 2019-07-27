import { IRemoteDocRef } from '../../interfaces';

/**
 * In memory remote doc implementation for testing purpose.
 */
export class FakeRemoteDoc implements IRemoteDocRef {
  constructor(private name: string, private database: any) {
  }

  get(): Promise<any> {
    if (this.database.docs[this.name]) {
      return Promise.resolve(this.database.docs[this.name]);
    } else {
      return Promise.reject();
    }
  }

  update(data: any) {
    this.database.docs[this.name] = {
      ...this.database.docs[this.name],
      ...data
    };

    return Promise.resolve();
  }
}
