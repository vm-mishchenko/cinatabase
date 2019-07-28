import { injectable } from 'inversify';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import { IRemoteDocRef, IRemoteDocData, IRemoteStore } from '../interfaces';
import { PouchDbRemoteDocStore } from './pouch-db-remote-doc.store';

PouchDB.plugin(PouchFind);

const POUCH_STORAGE_LOCAL_DB_NAME_KEY = 'pouchdb-storage:local-database-name';

export const REMOTE_STORE_TOKEN = Symbol.for('REMOTE_STORE_TOKEN');

export interface IdMeta {
  _id: string
}

interface IPouchDBDocument {
  _id: string;
}

// type IPouchDBDocument = IdMeta & Object;

@injectable()
export class RemoteStoreFactory implements IRemoteStore {
  private database: PouchDB.Database;

  constructor() {
    this.initializeDatabase();
  }

  doc<M>(name: string): IRemoteDocRef {
    return new PouchDbRemoteDocStore<M>(name, this.database);
  }

  /**
   * Most general interface for pouch-db search.
   */
  find(options): Promise<IRemoteDocData[]> {
    return this.database.find(options).then((entities) => {
      // todo: should clean up pouch-db specific data
      return entities as any;
    });
  }

  private initializeDatabase() {
    let localDbName = localStorage.getItem(POUCH_STORAGE_LOCAL_DB_NAME_KEY);

    if (!localDbName) {
      localDbName = this.getLocalDbName();
      localStorage.setItem(POUCH_STORAGE_LOCAL_DB_NAME_KEY, localDbName);
    }

    // todo: set auto_compaction for true, but need more investigation
    this.database = new PouchDB(localDbName, { auto_compaction: true });
  }

  /**
   * Creates new database name.
   */
  private getLocalDbName(): string {
    return String(Date.now());
  }
}
