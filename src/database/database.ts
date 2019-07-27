import { Container } from 'inversify';
import { Observable } from 'rxjs';
import { ICollection } from '../collection/collection';
import { COLLECTION_FACTORY_TOKEN, CollectionFactory, ICollectionFactory } from '../collection/collection.factory';
import { IDoc } from '../document/doc';
import { DOC_FACTORY_TOKEN, DocFactory, IDocFactory } from '../document/doc.factory';
import { IMediator, Mediator, MEDIATOR_TOKEN } from '../mediator';
import { MEMORY_STORE_TOKEN, MemoryStore } from '../memory/memory.store';
import { REMOTE_STORE_TOKEN, RemoteStoreFactory } from '../remote/remote-store.factory';

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

  private docFactory: IDocFactory;
  private collectionFactory: ICollectionFactory;

  /**
   * Already initialized documents.
   */
  private docs: Map<string, IDoc> = new Map();
  private collections: Map<string, ICollection> = new Map();

  constructor(private options: IDatabaseOptions = {}) {
    // initialize injector
    this.injector
      .bind(MEDIATOR_TOKEN)
      .to(Mediator)
      .inSingletonScope();
    this.injector
      .bind(MEMORY_STORE_TOKEN)
      .to((this.options.services && this.options.services.get(MEMORY_STORE_TOKEN)) || MemoryStore)
      .inSingletonScope();
    this.injector
      .bind(REMOTE_STORE_TOKEN)
      .to((this.options.services && this.options.services.get(REMOTE_STORE_TOKEN)) || RemoteStoreFactory)
      .inSingletonScope();
    this.injector
      .bind(DOC_FACTORY_TOKEN)
      .to(DocFactory)
      .inSingletonScope();
    this.injector
      .bind(COLLECTION_FACTORY_TOKEN)
      .to(CollectionFactory)
      .inSingletonScope();

    this.events$ = this.injector.get<IMediator>(MEDIATOR_TOKEN).events$;
    this.docFactory = this.injector.get<IDocFactory>(DOC_FACTORY_TOKEN);
    this.collectionFactory = this.injector.get<ICollectionFactory>(COLLECTION_FACTORY_TOKEN);

    // initialize extensions
    Database.extensions.forEach(extension => {
      extension.init(this);
    });
  }

  doc<M>(name: string): IDoc {
    if (!this.docs.has(name)) {
      this.docs.set(name, this.injector.get<DocFactory>(DOC_FACTORY_TOKEN).get(name));
    }

    return this.docs.get(name);
  }

  collection(name: string): ICollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, this.injector.get<ICollectionFactory>(COLLECTION_FACTORY_TOKEN).create(name));
    }

    return this.collections.get(name);
  }
}
