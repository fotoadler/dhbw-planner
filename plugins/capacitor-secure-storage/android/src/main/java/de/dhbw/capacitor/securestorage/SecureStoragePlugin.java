package de.dhbw.capacitor.securestorage;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureStorage")
public class SecureStoragePlugin extends Plugin {
    private static final String ANDROID_KEY_STORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "de.dhbw.raplaplan.secure-storage.v1";
    private static final String PREFS_NAME = "dhbw_secure_storage";
    private static final String IV_SEPARATOR = ".";
    private static final int IV_LENGTH_BYTES = 12;

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || key.trim().isEmpty() || value == null) {
            call.reject("A storage key and value are required");
            return;
        }

        try {
            String encrypted = encrypt(value);
            if (!preferences().edit().putString(key, encrypted).commit()) {
                call.reject("Unable to persist secure value");
                return;
            }
            call.resolve();
        } catch (GeneralSecurityException error) {
            call.reject("Unable to protect secure value", error);
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("A storage key is required");
            return;
        }

        String encrypted = preferences().getString(key, null);
        JSObject result = new JSObject();
        try {
            result.put("value", encrypted == null ? null : decrypt(encrypted));
            call.resolve(result);
        } catch (GeneralSecurityException error) {
            call.reject("Unable to read secure value", error);
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("A storage key is required");
            return;
        }

        preferences().edit().remove(key).apply();
        call.resolve();
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private String encrypt(String value) throws GeneralSecurityException {
        byte[] iv = new byte[IV_LENGTH_BYTES];
        new SecureRandom().nextBytes(iv);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, iv));
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

        return Base64.encodeToString(iv, Base64.NO_WRAP)
            + IV_SEPARATOR
            + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
    }

    private String decrypt(String encrypted) throws GeneralSecurityException {
        String[] parts = encrypted.split("\\.", 2);
        if (parts.length != 2) {
            throw new GeneralSecurityException("Invalid secure value");
        }

        byte[] iv = Base64.decode(parts[0], Base64.DEFAULT);
        byte[] ciphertext = Base64.decode(parts[1], Base64.DEFAULT);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    private SecretKey getOrCreateKey() throws GeneralSecurityException {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEY_STORE);
        try {
            keyStore.load(null);
        } catch (Exception error) {
            throw new GeneralSecurityException("Unable to load Android Keystore", error);
        }

        if (keyStore.containsAlias(KEY_ALIAS)) {
            KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
            throw new GeneralSecurityException("Secure storage key has an unexpected type");
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE);
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build());
        return generator.generateKey();
    }
}
