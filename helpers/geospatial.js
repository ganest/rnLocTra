const toRadians = d => d * 0.017453292519943295; // Math.PI / 180

const distance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const f1 = toRadians(lat1);
  const f2 = toRadians(lat2);
  const df = toRadians(lat2 - lat1);
  const dl = toRadians(lon2 - lon1);

  const sinHalfDf = Math.sin(df / 2);
  const sinHalfDl = Math.sin(dl / 2);
  const a =
    sinHalfDf * sinHalfDf + Math.cos(f1) * Math.cos(f2) * sinHalfDl * sinHalfDl;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const coordsDistance = (coord1, coord2) =>
  distance(coord1.lat, coord1.lon, coord2.lat, coord2.lon);

export const inPlace = (coords, place) =>
  coordsDistance(coords, place.center) <= place.radius;
