export interface IDatabase {
  doc(collectionId: string, docId: string);

  collection(collectionId: string);

  removeAllData();
}

export interface ISyncableDatabase {
  syncWithServer(): Promise<any>;
}
