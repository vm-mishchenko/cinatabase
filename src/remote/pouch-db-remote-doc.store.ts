import PouchDB from 'pouchdb';
import { Observable, Subject } from 'rxjs';
import { IRemoteDocStore } from '../interfaces';

export class PouchDbRemoteDocStore<M> implements IRemoteDocStore {
  // Represent id which is used for data storing in pouch database.
  private pouchDbId: PouchDB.Core.DocumentId = `${this.name}:${this.name}`;

  constructor(private name: string, private pouchDb: PouchDB.Database) {
  }

  /**
   * Retrieve document data from pouch database.
   * In case if document does not exist error will be thrown.
   * It's client responsibility to handle that error.
   */
  get(): Promise<M> {
    return this.getRawDoc().then((rawDoc) => this.extractDoc(rawDoc));
  }

  update(partialDoc: any) {
    return this.getRawDoc().then((rawDoc) => {
      // doc exists already, just update it
      return this.pouchDb.put({
        ...rawDoc,
        ...partialDoc,
      });
    }).catch(() => {
      // doc is not exist yet, let's create new one
      return this.pouchDb.put(this.createNewRawDoc(partialDoc));
    });
  }

  onSnapshot(): Observable<any> {
    return new Subject();
  }

  /**
   * Extracts original doc removing all pouch database metadata.
   */
  private extractDoc(rawDoc: PouchDB.Core.Document<M> & PouchDB.Core.GetMeta): any {
    const {
      _attachments,
      _id,
      _revisions,
      _rev,
      _revs_info,
      _conflicts,
      ...doc
    } = rawDoc;

    return doc;
  }

  /**
   * Returns document data as it's stored in pouch database.
   * It contains metadate which should be extracted before returning it
   * to the client.
   */
  private getRawDoc(): Promise<PouchDB.Core.Document<M> & PouchDB.Core.GetMeta> {
    return this.pouchDb.get(this.pouchDbId);
  }

  private createNewRawDoc(doc): PouchDB.Core.Document<M> & PouchDB.Core.IdMeta {
    return {
      _id: this.pouchDbId,
      ...doc,
    };
  }
}
