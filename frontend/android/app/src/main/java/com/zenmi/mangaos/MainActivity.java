package com.zenmi.mangaos;

import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private VolumeKeysPlugin volumeKeysPlugin;

    @Override
    public void onStart() {
        registerPlugin(VolumeKeysPlugin.class);
        super.onStart();
        volumeKeysPlugin = getBridge().getPlugin(VolumeKeysPlugin.class).getInstance();
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
