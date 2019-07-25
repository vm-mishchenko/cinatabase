import { injectable } from 'inversify';
import { Observable, Subject } from 'rxjs';

export const MEDIATOR_TOKEN = Symbol.for('MEDIATOR_TOKEN');

export interface IMediator {
  events$: Observable<any>;

  dispatch(event: any);
}

@injectable()
export class Mediator implements IMediator {
  events$: Observable<any> = new Subject<any>();

  dispatch(event: any) {
    (this.events$ as Subject<any>).next(event);
  }
}
