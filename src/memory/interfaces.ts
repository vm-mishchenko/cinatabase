import {IDatabase} from '../database/interfaces';
import {IDocSnapshot, IQuerySnapshot} from '../snapshot/interfaces';

export interface IMemoryDatabase extends IDatabase {
  // todo: need to define interface for inner databases entiites (memory/remote doc, collection)
  collections(): any[];
}

export interface IMemoryDocRef<IDoc> {
  snapshot(): IDocSnapshot<IDoc>;
}

export interface IMemoryCollectionRef<IDoc> {
  doc(docId: string): IMemoryDocRef<IDoc>;
}

export interface IMemoryQueryCollectionRef<IDoc> {
  snapshot(): IQuerySnapshot<IDoc>;
}
