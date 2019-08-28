// QUERY
export interface IQueryEqualCondition {
  [field: string]: string | number;
}

export interface IQueryOperators {
  [field: string]: {
    [operator: string]: string | number
  }
}

// @ts-ignore
export interface IQuery extends IQueryEqualCondition, IQueryOperators {
}

export interface ITrackableQuery {
  collectionId: string;
  identificator: string;
}

export class DocQuery implements ITrackableQuery {
  identificator = `${this.collectionId}/${this.docId}`;

  constructor(readonly collectionId: string, readonly docId: string) {
  }
}

// represent collection query
// single document is special case of collection query
export class CollectionQuery implements ITrackableQuery {
  identificator = JSON.stringify(this.query);

  constructor(readonly collectionId: string, readonly query: IQuery) {
  }
}
