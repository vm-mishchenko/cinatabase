import { Query, Store } from '@datorama/akita';
import { Observable } from 'rxjs';
import { IMemoryDocStore } from '../interfaces';

export class AkitaMemoryDocStore implements IMemoryDocStore {
  constructor(private store: Store<any>, private query: Query<any>) {
  }

  get() {
    return this.query.getValue();
  }

  update(data) {
    this.store.update(data);
  }

  onSnapshot(): Observable<any> {
    return this.query.select(data => data);
  }
}
