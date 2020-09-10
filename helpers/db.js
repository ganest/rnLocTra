import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase('logs.db');

export const init = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS bg_event (id INTEGER PRIMARY KEY NOT NULL, event_data TEXT NOT NULL );',
        [],
        () => {
          resolve();
        },
        (_, err) => {
          reject(err);
        },
      );
    });
  });
  return promise;
};

export const insertEvent = (db, eventData) => {
  const promise = new Promise((resolve, reject) => {    
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO bg_event (event_data) VALUES (?);`,
        [eventData],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        },
      );
    });
  });
  return promise;
};

export const fetchLoggedEvents = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM bg_event ORDER BY id DESC',
        [],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        },
      );
    });
  });
  return promise;
};

export const clearLoggedEvents = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM bg_event',
        [],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        },
      );
    });
  });
  return promise;
};
