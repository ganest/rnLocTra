package com.rnloctra.services;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.facebook.react.HeadlessJsTaskService;
import com.google.android.gms.location.ActivityRecognitionClient;
import com.google.android.gms.location.DetectedActivity;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.rnloctra.utils.Constants;

import java.util.List;

public class ActivityDetectionService extends Service {
    private static final String TAG = ActivityDetectionService.class.getSimpleName();

    private static final int SERVICE_NOTIFICATION_ID = 12345;
    private static final String CHANNEL_ID = "RN_ACT_REC";

    private Intent mIntentService;
    private PendingIntent mPendingIntent;
    private ActivityRecognitionClient mActivityRecognitionClient;

    // broadcast receiver for detected activity
    private BroadcastReceiver mBroadcastReceiver;
    private static int detectedValue = 0;

    public ActivityDetectionService() {
    }

    protected  void createAndRegisterBReceiver() {

        mBroadcastReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent.getAction().equals(Constants.BROADCAST_DETECTED_ACTIVITY)) {
                    int type = intent.getIntExtra("type", -1);
                    int confidence = intent.getIntExtra("confidence", 0);
                    handleUserActivity(context, type, confidence);
                }
            }
        };

        Context context = getApplicationContext();
        detectedValue = 0;
        LocalBroadcastManager.getInstance(getApplicationContext()).registerReceiver(mBroadcastReceiver,
                new IntentFilter(Constants.BROADCAST_DETECTED_ACTIVITY));
    }

    private void handleUserActivity(Context ctx, int type, int confidence) {
        String label = "Unknown";
        switch (type) {
            case DetectedActivity.IN_VEHICLE: {
                label = "In_Vehicle";
                break;
            }
            case DetectedActivity.ON_FOOT: {
                label = "On_Foot";
                break;
            }
            case DetectedActivity.RUNNING: {
                label = "Running";
                break;
            }
            case DetectedActivity.STILL: {
                label = "Still";
                break;
            }
            case DetectedActivity.TILTING: {
                label = "Tilting";
                break;
            }
            case DetectedActivity.WALKING: {
                label = "Walking";
                break;
            }
            case DetectedActivity.UNKNOWN: {
                break;
            }
        }

        Bundle bundle = new Bundle();

        if (detectedValue == 0) {
            detectedValue = confidence;
            bundle.putString("label", label);
            bundle.putInt("confidence", confidence);
        } else {
            if (confidence > Constants.CONFIDENCE) {
                detectedValue = confidence;
                bundle.putString("label", label);
                bundle.putInt("confidence", confidence);
            } else if (detectedValue <= confidence) {
                bundle.putString("label", label);
                bundle.putInt("confidence", confidence);
            }
        }
        if ( type == DetectedActivity.IN_VEHICLE ||
                type == DetectedActivity.WALKING ||
                type == DetectedActivity.STILL ) {
            sendEvent(ctx, Constants.ACTIVITY_TYPE, bundle);
        }
    }

    private void sendEvent(Context ctx, String eventName, @Nullable Bundle params) {

        /**
         * This part will be called every DETECTION_INTERVAL_IN_MILLISECONDS in order to detect
         * activity changes
         */
        if (!isAppOnForeground(ctx)) {
            Intent serviceIntent = new Intent(ctx, ActivityDetectionEventService.class);
            serviceIntent.putExtras(params);
            ctx.startService(serviceIntent);
            HeadlessJsTaskService.acquireWakeLockNow(ctx);
        }
    }

    private boolean isAppOnForeground(Context context) {
        /**
         We need to check if app is in foreground otherwise the app will crash.
         http://stackoverflow.com/questions/8489993/check-android-application-is-in-foreground-or-not
         **/
        ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> appProcesses =
                activityManager.getRunningAppProcesses();
        if (appProcesses == null) {
            return false;
        }
        final String packageName = context.getPackageName();
        for (ActivityManager.RunningAppProcessInfo appProcess : appProcesses) {
            if (appProcess.importance ==
                    ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                    appProcess.processName.equals(packageName)) {
                return true;
            }
        }
        return false;
    }

    protected void initialize() {
        mActivityRecognitionClient = new ActivityRecognitionClient(this);
        mIntentService = new Intent(this, DetectedActivityIntentService.class);
        mPendingIntent = PendingIntent.getService(
                this,
                1,
                mIntentService,
                PendingIntent.FLAG_UPDATE_CURRENT);
        requestActivityUpdatesHandler();
    }

    @Override
    public void onCreate() {
        Log.d(TAG, "onCreate(): create Activity Recognition client");
        super.onCreate();
        initialize();
        createAndRegisterBReceiver();
    }

    // request updates and set up callbacks for success or failure
    private  void requestActivityUpdatesHandler() {
        if(mActivityRecognitionClient != null){
            Task<Void> task = mActivityRecognitionClient.requestActivityUpdates(
                    Constants.DETECTION_INTERVAL_IN_MILLISECONDS,
                    mPendingIntent);

            // Adds a listener that is called if the Task completes successfully.
            task.addOnSuccessListener(new OnSuccessListener<Void>() {
                @Override
                public void onSuccess(Void result) {
                    Log.d(TAG, "Successfully requested activity updates");
                }
            });
            // Adds a listener that is called if the Task fails.
            task.addOnFailureListener(new OnFailureListener() {
                @Override
                public void onFailure(@NonNull Exception e) {
                    Log.e(TAG, "Requesting activity updates failed to start");
                }
            });
        }
    }

    private void createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "RN_ACT_REC", importance);
            channel.setDescription("CHANEL DESCRIPTION");
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        if (mBroadcastReceiver != null) {
            LocalBroadcastManager.getInstance(getApplicationContext()).unregisterReceiver(mBroadcastReceiver);
        }

        // need to remove the request to Google play services. Brings down the connection.
        removeActivityUpdatesHandler();
    }

    // remove updates and set up callbacks for success or failure
    public void removeActivityUpdatesHandler() {
        if (mActivityRecognitionClient != null) {
            Task<Void> task = mActivityRecognitionClient.removeActivityUpdates(
                    mPendingIntent);
            // Adds a listener that is called if the Task completes successfully.
            task.addOnSuccessListener(new OnSuccessListener<Void>() {
                @Override
                public void onSuccess(Void result) {
                    Log.d(TAG, "Removed activity updates successfully!");
                }
            });
            // Adds a listener that is called if the Task fails.
            task.addOnFailureListener(new OnFailureListener() {
                @Override
                public void onFailure(@NonNull Exception e) {
                    Log.e(TAG, "Failed to remove activity updates!");
                }
            });
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

}
