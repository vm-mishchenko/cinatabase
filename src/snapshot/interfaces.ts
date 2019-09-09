export interface IQuerySnapshot<IDoc> {
  data(): Array<IDocSnapshot<IDoc>>;
}

export interface IDocSnapshot<IDoc> {
  id: string;
  exists: boolean;

  data(): IDoc;
}
