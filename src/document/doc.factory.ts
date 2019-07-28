import { inject, injectable } from 'inversify';
import { IMemoryStore, IRemoteStore } from '../interfaces';
import { IMediator, MEDIATOR_TOKEN } from '../mediator';
import { MEMORY_STORE_TOKEN } from '../memory/memory.store';
import { REMOTE_STORE_TOKEN } from '../remote/remote-store.factory';
import { Doc, IDoc } from './doc';

export const DOC_FACTORY_TOKEN = Symbol.for('DOC_FACTORY_TOKEN');

export interface IDocFactory {
  get(name: string, docData?: any): IDoc;
}

@injectable()
export class DocFactory {
  constructor(
    @inject(MEDIATOR_TOKEN) private eventService: IMediator,
    @inject(REMOTE_STORE_TOKEN) private remoteStoreFactory: IRemoteStore,
    @inject(MEMORY_STORE_TOKEN) private memoryStoreFactory: IMemoryStore,
  ) {
  }

  /**
   * Creates document reference.
   */
  get(id: string, docData?: any): IDoc {
    return new Doc(
      id,
      this.memoryStoreFactory.doc(id),
      this.remoteStoreFactory.doc(id),
      this.eventService,
      docData,
    );
  }
}
