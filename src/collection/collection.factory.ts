import { inject, injectable, LazyServiceIdentifer } from 'inversify';
import { DOC_FACTORY_TOKEN } from '..';
import { IDocFactory } from '../document/doc.factory';
import { Collection, ICollection, InternalCollection } from './collection';

export const COLLECTION_FACTORY_TOKEN = Symbol.for('COLLECTION_FACTORY_TOKEN');

export interface ICollectionFactory {
  create(name): ICollection;
}

@injectable()
export class CollectionFactory implements ICollectionFactory {
  constructor(
    // as for me strange inversify behaviour, but there is no much time to investigate
    // https://github.com/inversify/InversifyJS/blob/master/wiki/circular_dependencies.md
    @inject(new LazyServiceIdentifer(() => DOC_FACTORY_TOKEN)) private docFactory: IDocFactory,
  ) {
  }

  /**
   * Creates document reference.
   */
  create(name: string): ICollection {
    const internalCollection = new InternalCollection(name, this.docFactory);
    return new Collection(internalCollection);
  }
}
