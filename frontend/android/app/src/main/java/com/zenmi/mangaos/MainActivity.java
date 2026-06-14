package com.zenmi.mangaos;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private VolumeKeysPlugin volumeKeysPlugin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VolumeKeysPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        volumeKeysPlugin = (VolumeKeysPlugin) getBridge().getPlugin("VolumeKeys").getInstance();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && volumeKeysPlugin != null) {
            if (volumeKeysPlugin.handleVolumeKey(event.getKeyCode())) {
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }
}
