import AsyncStorage from "@react-native-community/async-storage";

const storeRegions = async (key, regs) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify([...regs]));
  } catch (err) {
    console.log(err);
  }
};

const retrieveRegions = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      return new Set(JSON.parse(value));
    }
    return new Set();
  } catch (e) {
    console.log(e);
    return new Set();
  }
};