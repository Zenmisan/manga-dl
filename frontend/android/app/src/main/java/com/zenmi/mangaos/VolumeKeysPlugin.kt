package com.zenmi.mangaos

import android.view.KeyEvent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "VolumeKeys")
class VolumeKeysPlugin : Plugin() {
    var enabled = false
        private set

    @PluginMethod
    fun enable(call: PluginCall) {
        enabled = true
        call.resolve()
    }

    @PluginMethod
    fun disable(call: PluginCall) {
        enabled = false
        call.resolve()
    }

    fun handleVolumeKey(keyCode: Int): Boolean {
        if (!enabled) return false
        return when (keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP -> {
                notifyListeners("volumeUp", null)
                true
            }
            KeyEvent.KEYCODE_VOLUME_DOWN -> {
                notifyListeners("volumeDown", null)
                true
            }
            else -> false
        }
    }
}
