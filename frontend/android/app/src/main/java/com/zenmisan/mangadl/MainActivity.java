package com.zenmisan.mangadl;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

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
        try {
            PluginHandle handle = getBridge().getPlugin("VolumeKeys");
            if (handle != null) {
                volumeKeysPlugin = (VolumeKeysPlugin) handle.getInstance();
            }
        } catch (Exception ignored) {
        }
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
