package com.rnloctra;

import android.content.BroadcastReceiver;
import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.rnloctra.services.ActivityDetectionService;

/**
 * The module itself is responsible for defining the methods and props that will be
 * available to the RN layer in the native layer. To expose a Java method, it must be
 * annotated using @ReactMethod and the return type will always be void.
 */
public class ActivityRecognitionModule extends ReactContextBaseJavaModule {
    private static final String TAG = ActivityDetectionService.class.getSimpleName();

    public static final String REACT_CLASS = "G4MActivityRecognition";

    private static ReactApplicationContext mReactContext;
    private BroadcastReceiver mBroadcastReceiver;
    private static int detectedValue = 0;

    public ActivityRecognitionModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        this.mReactContext = reactContext;
    }

    /**
     *  The purpose of this method is to return the string name of the Native Module
     *  which represents this class in JavaScript.
     *
     *  So here we call this ActivityRecognition so that we can access it through
     *  React.NativeModules.ActivityRecognition in JavaScript
     *
     * @return the string name of the module in JS world
     */
    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    /**
     * To expose a method to JavaScript a Java method must be annotated using @ReactMethod.
     * The return type of a bridge method is always void. React Native bridge is asynchronous,
     * so the only way to pass a result to JavaScript is by using callbacks or emitting events
     */
    @ReactMethod
    public void startARTracking() {
        Intent mIntent = new Intent(this.mReactContext, ActivityDetectionService.class);
        this.mReactContext.startService(mIntent);
    }

    @ReactMethod
    public void stopARTracking() {
        if (mBroadcastReceiver != null) {
            LocalBroadcastManager.getInstance(this.mReactContext).unregisterReceiver(mBroadcastReceiver);
        }

        this.mReactContext.stopService(new Intent(this.mReactContext, ActivityDetectionService.class));
    }
}
