import {IDatabase, ISyncableDatabase} from '../database/interfaces';
import {IDocSnapshot, IQuerySnapshot} from '../snapshot/interfaces';

export interface IRemoteDatabase extends IDatabase, ISyncableDatabase {
}

export interface IRemoteDocRef<IDoc> {
  snapshot(): Promise<IDocSnapshot<IDoc>>;
}

export interface IRemoteCollectionRef<IDoc> {
  doc(docId: string): IRemoteDocRef<IDoc>;
}

export interface IRemoteQueryCollectionRef<IDoc> {
  snapshot(): Promise<IQuerySnapshot<IDoc>>;
}
