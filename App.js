import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Platform, FlatList, TouchableOpacity } from "react-native";
import { Permissions } from "react-native-unimodules";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import SQLite from "react-native-sqlite-storage";

import G4MActivityRecognition from "./G4MActivityRecognition";

import { init, insertEvent, fetchLoggedEvents, clearLoggedEvents } from "./helpers/db";
import { LOCATION_GEOFENCING, LOCATION_TRACKING } from "./helpers/constants";

import { regions } from "./regions";
import { inPlace } from "./helpers/geospatial";

let inRegion = new Set();
// let visitedRegions = [];

export const initializeRegions = () => {
  inRegion = new Set();
};

init()
  .then(() => {
    console.log("Initialized database");
  })
  .catch((err) => {
    console.log("Initializing db failed.");
    console.log(err);
  });

// // it is called by Task LOCATION_GEOFENCING and have to be global
// const showNotification = async (title, body) => {
//   const id = await Notifications.scheduleNotificationAsync({
//     content: {
//       title,
//       body,
//       sound: true,
//       android: {
//         channelId: "G4M-geofencing",
//       },
//     },
//     trigger: null,
//   });
// };

function Item({ title }) {
  return (
    <View style={styles.item}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
    };
  },
});

export function App() {
  const [isTracking, setIsTracking] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logData, setLogData] = useState([]);

  const startTracking = async () => {
    if (!isTracking) {
      await G4MActivityRecognition.startARTracking();
      setShowLog(false);
      setIsTracking(true);
      console.log("Tracking started");
    } else {
      await G4MActivityRecognition.stopARTracking();
      // const hasStarted = await Location.hasStartedGeofencingAsync(LOCATION_GEOFENCING);
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
      console.log(hasStarted);
      if (hasStarted) {
        // await Location.stopGeofencingAsync(LOCATION_GEOFENCING);
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      }
      setIsTracking(false);
      console.log("Tracking stopped");
    }
  };

  const resultsArray = (dbResult) => {
    let results = [];
    const resSize = dbResult.rows.length;
    for (let i = 0; i < resSize; ++i) results.push(dbResult.rows.item(i));

    return results;
  };

  const loadLogs = async () => {
    try {
      if (!showLog) {
        setShowLog(true);
        const dbResult = await fetchLoggedEvents();
        setLogData(resultsArray(dbResult));
      } else {
        setShowLog(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const clearLogs = async () => {
    try {
      const dbResult = await clearLoggedEvents();
      setLogData([]);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    const config = async () => {
      try {
        let res = await Permissions.askAsync(Permissions.LOCATION);
        // let res = await Location.requestPermissionsAsync();
        if (res.status !== "granted") {
          console.log("Permission to access location was denied");
        } else {
          console.log("Permission to access location granted");
        }

        res = await Permissions.getAsync(Permissions.NOTIFICATIONS);
        if (res.status !== "granted") {
          res = await Permissions.askAsync(Permissions.Notifications);
          if (res.status !== "granted") {
            console.log("Permission to show notifications was denied");
          } else {
            console.log("Permission to show notifications granted");
          }
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("G4M-geofencing", {
            name: "G4M messages",
            sound: true,
            vibrate: true,
          });
        }
      } catch (err) {
        console.log(err);
      }
    };
    config();
  }, []);

  let logArea;
  if (showLog) {
    if (logData.length > 0) {
      logArea = (
        <FlatList
          data={logData}
          renderItem={({ item }) => <Item title={item.event_data} />}
          keyExtractor={(item) => `${item.id}`}
        />
      );
    } else {
      logArea = <Text>Empty Log</Text>;
    }
  }
  return (
    <View style={styles.container}>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.buttonStyle} onPress={startTracking}>
          <Text style={styles.buttonText}>{isTracking ? "Stop tracking" : "Start tracking"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonStyle} onPress={loadLogs}>
          <Text style={styles.buttonText}>{showLog ? "Hide Logs" : "Show Logs"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonStyle} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.logContainer}>{logArea}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 24,
  },
  buttonsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  logContainer: {
    flex: 10,
    justifyContent: "space-around",
    alignItems: "center",
  },
  buttonStyle: {
    display: "flex",
    height: 25,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,

    backgroundColor: "#2AC062",
    shadowColor: "#2AC062",
    shadowOpacity: 0.4,
    shadowOffset: { height: 10, width: 0 },
    shadowRadius: 20,
  },

  buttonText: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },

  listArea: {
    backgroundColor: "#f0f0f0",
    flex: 1,
    paddingTop: 32,
  },
  item: {
    backgroundColor: "powderblue",
    padding: 10,
    marginVertical: 2,
    marginHorizontal: 8,
  },
  title: {
    fontSize: 10,
  },
});

// TaskManager.defineTask(LOCATION_GEOFENCING, async ({ data: { eventType, region }, error }) => {
//   const now = `${new Date(Date.now()).toLocaleString("el-GR")}`;
//   const db = SQLite.openDatabase("logs.db");

//   if (error) {
//     // check `error.message` for more details.
//     await insertEvent(db, `ERROR: ${error}`);
//     return;
//   }

//   await insertEvent(db, `${now}, ${eventType}`);
//   // log inRegion
//   await insertEvent(db, `Regions:${[...inRegion]}`);

//   if (eventType === Location.GeofencingEventType.Enter) {
//     if (inRegion.has(region.identifier)) return; // should never happened... avoid double enter bug of expo

//     inRegion.add(region.identifier);

//     await insertEvent(db, `ENTER: ${region.identifier}, ${now}`);

//     showNotification("ENTER", `${region.identifier}, ${now}: `);
//   } else if (eventType === Location.GeofencingEventType.Exit) {
//     if (!inRegion.has(region.identifier)) return; // has not ever entered, consider it false alarm and ignore

//     inRegion.delete(region.identifier);
//     await insertEvent(db, `EXIT: ${region.identifier}, ${now}`);

//     showNotification("ΕΧΙΤ", `${region.identifier}, ${now}`);
//   }
// });

// TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
//   const now = `${new Date(Date.now()).toLocaleString("el-GR")}`;
//   const db = SQLite.openDatabase("logs.db");

//   // await insertEvent(db, `${now}, LT task called`);
//   if (error) {
//     await insertEvent(db, `ERROR: ${error.message}`);
//     return;
//   }

//   if (data) {
//     const { locations } = data;
//     if (locations && locations[0]) {
//       let lat = locations[0].coords.latitude;
//       let lon = locations[0].coords.longitude;
//       await insertEvent(db, `${now}, ${lat}, ${lon}`);

//       const regionsEntered = regions.filter((r) =>
//         inPlace({ lat, lon }, { center: { lat: r.latitude, lon: r.longitude }, radius: r.radius })
//       );

//       const newVisitedRegions = regionsEntered.filter((r) => {
//         if (!visitedRegions.find((elm) => elm.identifier === r.identifier)) {
//           showNotification(("Enter", `${r.identifier}, ${now}`));
//           return r;
//         }
//       });

//       const regionsExited = visitedRegions.filter(
//         (r) => {
//           if (!inPlace(
//             { lat, lon },
//             { center: { lat: r.latitude, lon: r.longitude }, radius: r.radius }
//           )) {
//             showNotification("ΕΧΙΤ", `${r.identifier}, ${now}`);
//             return r;
//           }
//         }
//       );

//       // update visited regions list
//       visitedRegions = visitedRegions.map((r) => {
//         if (!regionsExited.find((elm) => elm.identifier === r.identifier)) return r;
//       });
//       visitedRegions = visitedRegions.concat(newVisitedRegions);
//     }
//   }
// });
