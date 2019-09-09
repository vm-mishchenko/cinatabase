import {Observable} from 'rxjs';
import {IDocSnapshot, IQuerySnapshot} from '../snapshot/interfaces';

export interface IDocRef<IDoc> {
  snapshot(): Promise<IDocSnapshot<IDoc>>;

  onSnapshot(): Observable<IDocSnapshot<IDoc>>;
}

export interface ICollectionRef<IDoc> {
  doc(docId: string): IDocRef<IDoc>;
}

export interface ICollectionQueryRef<IDoc> {
  snapshot(): Promise<IQuerySnapshot<IDoc>>;
}
