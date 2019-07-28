import PouchDB from 'pouchdb';
import { IRemoteDocData, IRemoteDocRef } from '../interfaces';

export class PouchDbRemoteDocStore<M> implements IRemoteDocRef {
  // Represent id which is used for data storing in pouch database.
  private pouchDbId: PouchDB.Core.DocumentId = `${this.name}`;

  constructor(private name: string, private pouchDb: PouchDB.Database) {
  }

  /**
   * Retrieve document data from pouch database.
   * In case if document does not exist error will be thrown.
   * It's client responsibility to handle that error.
   */
  get(): Promise<IRemoteDocData> {
    return this.getRawDoc().then(rawDoc => this.extractDoc(rawDoc));
  }

  update(partialDoc: any) {
    return this.getRawDoc()
      .then(rawDoc => {
        // doc exists already, just update it
        return this.pouchDb.put({
          ...rawDoc,
          ...partialDoc,
        });
      })
      .catch(() => {
        // doc is not exist yet, let's create new one
        return this.pouchDb.put(this.createNewRawDoc(partialDoc));
      });
  }

  /**
   * Extracts original doc removing all pouch database metadata.
   */
  private extractDoc(rawDoc: PouchDB.Core.Document<M> & PouchDB.Core.GetMeta): IRemoteDocData {
    const { _attachments, _revisions, _rev, _revs_info, _conflicts, ...doc } = rawDoc;

    return doc;
  }

  /**
   * Returns document data as it's stored in pouch database.
   * It contains metadata which should be extracted before returning it
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
