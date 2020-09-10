package com.rnloctra.utils;

public class Constants {

    public static final String BROADCAST_DETECTED_ACTIVITY = "activity_intent";

    // the desired time between activity detections. Larger values will result in fewer activity
    // detections while improving battery life. A value of 0 will result in activity detections
    // at the fastest possible rate.
    public static final long DETECTION_INTERVAL_IN_MILLISECONDS = 30000; // every N seconds

    public static final int CONFIDENCE = 50;

    public static final String ACTIVITY_TYPE = "activity_type";
}
