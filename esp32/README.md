# ESP32 Driver Health Monitoring

Single `.ino` file. No email/password. Uses **Firebase Database Secret**.

## Setup

### 1. Get Database Secret

- Firebase Console → Project Settings (gear) → **Service accounts**
- Scroll to **Database secrets** → **Show** → Copy the secret

### 2. Edit the .ino File

At the top of `driver_health_monitor.ino`, set:

```cpp
#define WIFI_SSID           "YourWiFiName"
#define WIFI_PASSWORD       "YourWiFiPassword"
#define FIREBASE_DATABASE_SECRET "paste_your_secret_here"
```

`FIREBASE_API_KEY` and `FIREBASE_DATABASE_URL` are already filled for your project.

### 3. Firebase Rules

Publish the rules from `firebase-rules.json` in Firebase Console → Realtime Database → Rules.

**Note:** With the database secret, the ESP32 bypasses rules. Rules apply only to the app (admin/driver login).

### 4. Arduino IDE

- Install **Firebase ESP Client** (Library Manager)
- Install **MAX30105** by SparkFun
- Board: ESP32 Dev Module
- Upload

## Flow

1. ESP32 connects WiFi → auth via database secret
2. Registers in `/devices/{MAC}`, sends heartbeat to `status/lastSeen`
3. Polls `/deviceControl/{MAC}` for `startReading`
4. When `startReading` is true: collects 30 s session → uploads to `/sessions/{targetDriver}/`
5. Resets `startReading` when done
