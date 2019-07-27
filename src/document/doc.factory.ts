import { inject, injectable } from 'inversify';
import { IMemoryStore, IRemoteStore } from '../interfaces';
import { IMediator, MEDIATOR_TOKEN } from '../mediator';
import { MEMORY_STORE_TOKEN } from '../memory/memory.store';
import { REMOTE_STORE_TOKEN } from '../remote/remote-store.factory';
import { Doc, IDoc } from './doc';

export const DOC_FACTORY_TOKEN = Symbol.for('DOC_FACTORY_TOKEN');

@injectable()
export class DocFactory {
  constructor(
    @inject(MEDIATOR_TOKEN) private eventService: IMediator,
    @inject(REMOTE_STORE_TOKEN) private remoteStoreFactory: IRemoteStore,
    @inject(MEMORY_STORE_TOKEN) private memoryStoreFactory: IMemoryStore,
  ) {}

  /**
   * Creates document reference.
   */
  get(name: string): IDoc {
    return new Doc(name, this.memoryStoreFactory.doc(name), this.remoteStoreFactory.doc(name), this.eventService);
  }
}
