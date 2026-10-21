package com.melisauyar.budgetbuddy;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;

/** Opens the BudgetBuddy web app in a Trusted Web Activity. */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation on Android 8.0 with a translucent theme crashes;
        // see https://github.com/GoogleChromeLabs/bubblewrap/issues/496.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
