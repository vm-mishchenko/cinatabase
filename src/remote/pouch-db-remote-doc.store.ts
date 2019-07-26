import PouchDB from 'pouchdb';
import { Observable, Subject } from 'rxjs';
import { IRemoteDocStore } from '../interfaces';

export class PouchDbRemoteDocStore implements IRemoteDocStore {
  constructor(private pouchDb: PouchDB) {}

  get() {
    return Promise.resolve({});
  }

  update(data) {
    return Promise.resolve();
  }

  onSnapshot(): Observable<any> {
    return new Subject();
  }
}
