import { AppRegistry } from "react-native";
import * as Location from "expo-location";
import SQLite from "react-native-sqlite-storage";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { App, initializeRegions } from "./App";
import { inPlace } from "./helpers/geospatial";
import {
  LOCATION_GEOFENCING,
  LOCATION_TRACKING,
  WALKING,
  STILL,
  IN_VEHICLE,
} from "./helpers/constants";

import { init, insertEvent } from "./helpers/db";
import { regions } from "./regions";

init()
  .then(() => {
    console.log("Initialized database");
  })
  .catch((err) => {
    console.log("Initializing db failed.");
    console.log(err);
  });

// const G4MActivityRecognition = async (taskData) => {
//   const now = `${new Date(Date.now()).toLocaleString("el-GR")}`;
//   console.log(`Receiving New AR Alert! ${now}`);
//   console.log(`taskData! ${JSON.stringify(taskData)}`);

//   if (taskData && taskData.label) {
//     try {
//       const db = SQLite.openDatabase("logs.db");
//       await insertEvent(db, `${taskData.label}, ${taskData.confidence}, ${now}`);
//       if (taskData.label === WALKING || taskData.label === IN_VEHICLE) {
//         const hasStarted = await Location.hasStartedGeofencingAsync(LOCATION_GEOFENCING);
//         if (!hasStarted) {
//           await insertEvent(db, `Initialize regions `);
//           initializeRegions();
//           await insertEvent(db, `Try to start geofencing`);
//           await Location.startGeofencingAsync(LOCATION_GEOFENCING, regions);

//           await insertEvent(db, `User on move geofencing started`);
//         }
//       }

//       if (taskData.label === STILL) {
//         G4MActivityRecognition.still++;
//         await insertEvent(db, `still counter: ${G4MActivityRecognition.still}`);
//         console.log(`still counter: ${G4MActivityRecognition.still}`);
//       }
//     } catch (err) {
//       console.log(err);
//     }
//   }
// };

const G4MActRec = async (taskData) => {
  const now = `${new Date(Date.now()).toLocaleString("el-GR")}`;
  console.log(`Receiving New AR Alert! ${now}`);
  console.log(`taskData! ${JSON.stringify(taskData)}`);

  if (taskData && taskData.label) {
    try {
      const db = SQLite.openDatabase("logs.db");
      await insertEvent(db, `${taskData.label}, ${taskData.confidence}, ${now}`);
      if (taskData.label === WALKING || taskData.label === IN_VEHICLE) {
        G4MActRec.still = 0;
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
        if (!hasStarted) {
          await insertEvent(db, `Try to start location tracking`);

          await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 30000,
            distanceInterval: 0,
            foregroundService: {
              notificationTitle: "GPS",
              notificationBody: " enabled",
              notificationColor: "#0000FF",
            },
          });

          await insertEvent(db, `User on move location tracking started`);
        }
      }

      if (taskData.label === STILL) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
        if (hasStarted) {
          G4MActRec.still++;
          await insertEvent(db, `still counter: ${G4MActRec.still}`);
          if (G4MActRec.still >= 3) {
            await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
            G4MActRec.still = 0;
            await insertEvent(db, `location trakcing stopped`);
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
};

G4MActRec.still = 0;
G4MActRec.visitedRegions = [];

AppRegistry.registerHeadlessTask("G4MActivityRecognition", () => G4MActRec);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
// registerRootComponent(App);

AppRegistry.registerComponent("main", () => App);

TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  const now = `${new Date(Date.now()).toLocaleString("el-GR")}`;
  const db = SQLite.openDatabase("logs.db");

  // await insertEvent(db, `${now}, LT task called`);
  if (error) {
    await insertEvent(db, `ERROR: ${error.message}`);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations[0]) {
      let lat = locations[0].coords.latitude;
      let lon = locations[0].coords.longitude;
      await insertEvent(db, `${now}, ${lat}, ${lon}`);

      await insertEvent(db, `visited: ${JSON.stringify(G4MActRec.visitedRegions)}`);

      const regionsEntered = regions.filter((r) =>
        inPlace({ lat, lon }, { center: { lat: r.latitude, lon: r.longitude }, radius: r.radius })
      );

      await insertEvent(db, `entered: ${JSON.stringify(regionsEntered)}`);

      const newVisitedRegions = regionsEntered.filter((r) => {
        if (!G4MActRec.visitedRegions.find((elm) => elm.identifier === r.identifier)) {
          showNotification("ENTER", `${r.identifier}, ${now}`);
          return r;
        }
      });

      await insertEvent(db, `new entered: ${JSON.stringify(newVisitedRegions)}`);

      const regionsExited = G4MActRec.visitedRegions.filter((r) => {
        if (
          !inPlace(
            { lat, lon },
            { center: { lat: r.latitude, lon: r.longitude }, radius: r.radius }
          )
        ) {
          showNotification("ΕΧΙΤ", `${r.identifier}, ${now}`);
          return r;
        }
      });

      await insertEvent(db, `exited: ${JSON.stringify(regionsExited)}`);

      // update visited regions list
      G4MActRec.visitedRegions = G4MActRec.visitedRegions.filter((r) => {
        if (!regionsExited.find((elm) => elm.identifier === r.identifier)) return r;
      });

      G4MActRec.visitedRegions = G4MActRec.visitedRegions.concat(newVisitedRegions);

      await insertEvent(db, `updated visited: ${JSON.stringify(G4MActRec.visitedRegions)}`);
    }
  }
});

// it is called by Task  LOCATION_TRACKING and have to be global
const showNotification = async (title, body) => {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      android: {
        channelId: "G4M-geofencing",
      },
    },
    trigger: null,
  });
};
