import { Observable, Subject } from 'rxjs';
import { IRemoteDocStore } from '../../interfaces';

/**
 * In memory remote doc implementation for testing purpose.
 */
export class FakeRemoteDoc implements IRemoteDocStore {
  constructor(private name: string, private database: any) {
  }

  get() {
    return Promise.resolve(this.database.docs[this.name]);
  }

  update(data: any) {
    this.database.docs[this.name] = {
      ...this.database.docs[this.name],
      ...data,
    };

    return Promise.resolve();
  }

  onSnapshot(): Observable<any> {
    return new Subject();
  }
}
