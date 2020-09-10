import { AppRegistry } from "react-native";
import * as Location from "expo-location";
import SQLite from "react-native-sqlite-storage";


import { App, initializeRegions  } from "./App";
import { LOCATION_GEOFENCING, WALKING,STILL, IN_VEHICLE } from "./helpers/constants";

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

const G4MActivityRecognition = async (taskData) => {
  const now = `${new Date(Date.now()).toLocaleString("el-GR")}`;
  console.log(`Receiving New AR Alert! ${now}`);
  console.log(`taskData! ${JSON.stringify(taskData)}`);

  if (taskData && taskData.label) {
    try {
      const db = SQLite.openDatabase("logs.db");
      await insertEvent(db, `${taskData.label}, ${taskData.confidence}, ${now}`);
      if (taskData.label === WALKING || taskData.label === IN_VEHICLE) {
        const hasStarted = await Location.hasStartedGeofencingAsync(LOCATION_GEOFENCING);
        if (!hasStarted) {
          await insertEvent(db, `Initialize regions `);          
          initializeRegions();
          await insertEvent(db, `Try to start geofencing`);          
          await Location.startGeofencingAsync(LOCATION_GEOFENCING, regions);

          await insertEvent(db, `User on move geofencing started`);
        }
      }

      if (taskData.label === STILL) {
        G4MActivityRecognition.still++;
        await insertEvent(db, `still counter: ${G4MActivityRecognition.still}`);  
        console.log(`still counter: ${G4MActivityRecognition.still}`);
      }
    } catch (err) {
      console.log(err);
    }
  }
};

G4MActivityRecognition.still = 0;

AppRegistry.registerHeadlessTask("G4MActivityRecognition", () => G4MActivityRecognition);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
// registerRootComponent(App);

AppRegistry.registerComponent("main", () => App);
