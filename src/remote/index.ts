import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import {Observable, Subject} from 'rxjs';
import {IQueryRequest} from '../manager/query';
import {DocSnapshot} from '../manager/snapshot';

PouchDB.plugin(PouchFind);

const POUCH_STORAGE_LOCAL_DB_NAME_KEY = 'pouchdb-storage:local-database-name';

class RemoteDocRef {
  private databaseDocId = `${this.collectionId}:${this.docId}`;

  constructor(private collectionId: string, private docId: string, private database: any) {
  }

  update(newData: any) {
    return this.getRawDoc().then((rawData) => {
      return this.database.put({
        ...rawData,
        ...newData
      });
    });
  }

  snapshot() {
    return this.getRawDoc().then((rawDoc) => {
      const {id, ...docData} = this.extractDoc(rawDoc);

      return new DocSnapshot(id, docData);
    });
  }

  /** Create new doc if doesn't exist and set data*/
  set(newData) {
    return this.isExist().then(() => {
      return this.getRawDoc().then((rawData) => {
        const {_id, type, id, _rev, ...previousData} = rawData;

        // rewrite any previous data
        return this.database.put({
          _id,
          _rev,
          id,
          type,
          ...newData
        });
      });
    }, () => {
      return this.createNew(newData);
    });
  }

  isExist() {
    return this.getRawDoc().then(() => true);
  }

  private createNew(newData: any) {
    const data = {
      _id: this.databaseDocId,
      id: this.docId,
      type: this.collectionId,
      ...newData
    };

    return this.database.put(data);
  }

  private getRawDoc(): Promise<any> {
    return this.database.get(this.databaseDocId);
  }

  private extractDoc(rawDoc) {
    const {_id, _rev, type, ...doc} = rawDoc;

    return doc;
  }
}

class RemoteCollectionRef {
  constructor(private collectionId: string, private database: any) {
  }

  doc(docId: string) {
    return new RemoteDocRef(this.collectionId, docId, this.database);
  }

  query(query: IQueryRequest = {}) {
    return new RemoteQueryCollectionRef(this.collectionId, query, this.database);
  }
}

class RemoteQueryCollectionRef {
  constructor(private collectionId: string, private query: IQueryRequest, private database: any) {
  }

  update() {
  }

  snapshot() {
    return this.database.find({
      selector: {
        selector: {},
        type: this.collectionId
      }
    }).then((result) => {
      return result.docs.map((rawDoc) => {
        const {_id, _rev, type, ...doc} = rawDoc;

        return doc;
      });
    });
  }
}

class RemoteAPI {
  constructor(private eventManager: EventManager) {
  }

  notify(event) {
    this.eventManager.notify(event);
  }
}

class EventManager {
  events$: Observable<any> = new Subject();

  notify(event: any) {
    (this.events$ as Subject<any>).next(event);
  }
}

export class RemoteDb {
  events$: Observable<any>;
  private database: any;
  private readonly api: RemoteAPI;
  private readonly eventManager: EventManager;

  constructor() {
    this.eventManager = new EventManager();
    this.api = new RemoteAPI(this.eventManager);
    this.events$ = this.eventManager.events$;

    this.initializeDatabase();
  }

  doc(collectionId: string, docId: string) {
    return new RemoteDocRef(collectionId, docId, this.database);
  }

  collection(collectionId: string) {
    return new RemoteCollectionRef(collectionId, this.database);
  }

  private initializeDatabase() {
    let localDbName = localStorage.getItem(POUCH_STORAGE_LOCAL_DB_NAME_KEY);

    if (!localDbName) {
      localDbName = this.getLocalDbName();
      localStorage.setItem(POUCH_STORAGE_LOCAL_DB_NAME_KEY, localDbName);
    }

    // todo: set auto_compaction for true, but need more investigation
    this.database = new PouchDB(localDbName, {auto_compaction: true});
  }

  private getLocalDbName(): string {
    return String(Date.now());
  }
}
