import { Container } from 'inversify';
import { Observable } from 'rxjs';
import { IDoc } from './document/doc';
import { DOC_FACTORY_TOKEN, DocFactory } from './document/doc.factory';
import { IMediator, Mediator, MEDIATOR_TOKEN } from './mediator';
import { MemoryStore, MEMORY_STORE_TOKEN } from './memory/memory.store';
import { RemoteStoreFactory, REMOTE_STORE_TOKEN } from './remote/remote-store.factory';

export interface IDatabaseOptions {
  services?: Map<Symbol, any>;
}

export class Database {
  static registerGlobalExtension(extension) {
    Database.extensions.push(extension);
  }

  private static extensions = [];

  events$: Observable<any>;
  injector: Container = new Container();

  private cachedDocs: Map<string, IDoc> = new Map();

  constructor(private options: IDatabaseOptions = {}) {
    // initialize injector
    this.injector
      .bind(MEDIATOR_TOKEN)
      .to(Mediator)
      .inSingletonScope();
    this.injector
      .bind(DOC_FACTORY_TOKEN)
      .to(DocFactory)
      .inSingletonScope();
    this.injector
      .bind(MEMORY_STORE_TOKEN)
      .to((this.options.services && this.options.services.get(MEMORY_STORE_TOKEN)) || MemoryStore)
      .inSingletonScope();
    this.injector
      .bind(REMOTE_STORE_TOKEN)
      .to((this.options.services && this.options.services.get(REMOTE_STORE_TOKEN)) || RemoteStoreFactory)
      .inSingletonScope();

    this.events$ = this.injector.get<IMediator>(MEDIATOR_TOKEN).events$;

    // initialize extensions
    Database.extensions.forEach(extension => {
      extension.init(this);
    });
  }

  doc(name: string): IDoc {
    if (!this.cachedDocs.has(name)) {
      this.cachedDocs.set(name, this.injector.get<DocFactory>(DOC_FACTORY_TOKEN).get(name));
    }

    return this.cachedDocs.get(name);
  }
}
