import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('reading_list.db');

export const initDB = () => {
  return new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT,
          status TEXT DEFAULT 'planning',
          created_at INTEGER
        );`,
        [],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};
