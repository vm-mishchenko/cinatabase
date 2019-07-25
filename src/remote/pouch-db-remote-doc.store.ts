import PouchDB from 'pouchdb';
import { Observable, Subscription } from 'rxjs';
import { IRemoteDocStore } from '../interfaces';

export class PouchDbRemoteDocStore implements IRemoteDocStore {
  constructor(private pouchDb: PouchDB) {}

  get() {
    return Promise.resolve({});
  }

  update(data) {
    return Promise.resolve();
  }

  onSnapshot(fn: (data: any) => any): Subscription {
    return new Observable().subscribe(data => {
      fn(data);
    });
  }
}
