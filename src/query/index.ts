// QUERY
export interface IQueryEqualCondition {
  [field: string]: string | number;
}

export interface IQueryOperators {
  [operator: string]: string | number;
}

// @ts-ignore
export interface IQueryRequest {
  [field: string]: string | number | IQueryOperators;
}

/** <Entity> that has unique identificator. */
export interface ITrackableIdentificator {
  identificator: string;
}

export class DocIdentificator implements ITrackableIdentificator {
  readonly identificator = `${this.collectionId}/${this.docId}`;

  constructor(readonly collectionId: string, readonly docId: string) {
  }
}

/**
 * Represents collection query.
 * Internal representation which Mutate and Sync servers understand.
 * Might represent 0 to N documents withing particular collection
 */
export class QueryIdentificator implements ITrackableIdentificator {
  readonly identificator = `${this.collectionId}/${JSON.stringify(this.queryRequest)}`;

  constructor(readonly collectionId: string, readonly queryRequest: IQueryRequest) {
  }
}
