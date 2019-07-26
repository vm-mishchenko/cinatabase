import { Query, Store } from '@datorama/akita';
import { Observable, Subscription } from 'rxjs';
import { IMemoryDocStore } from '../interfaces';

export class AkitaMemoryDocStore implements IMemoryDocStore {
  constructor(private store: Store<any>, private query: Query<any>) {}

  get() {
    return Promise.resolve(this.query.getValue());
  }

  update(data): Promise<any> {
    this.store.update(data);

    return Promise.resolve();
  }

  onSnapshot(): Observable<any> {
    return this.query.select(data => data);
  }
}
