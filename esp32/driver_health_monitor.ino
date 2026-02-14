/**
 * Driver Health Monitoring - ESP32 Firmware
 *
 * Single .ino file - no separate config. Uses Firebase Database Secret (no email/password).
 * Get Database Secret: Firebase Console > Project Settings > Service accounts > Database secrets
 *
 * Flow:
 * 1. ESP32 connects WiFi, authenticates via database secret
 * 2. Registers in /devices/{MAC}, updates heartbeat
 * 3. Polls /deviceControl/{MAC} for startReading
 * 4. When startReading=true: collects session → uploads to /sessions/{targetDriver}/
 * 5. Resets startReading flag
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include "MAX30105.h"

#include <Firebase_ESP_Client.h>
#include "addons/RTDBHelper.h"

// ================= EDIT THESE VALUES =================
#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"

#define FIREBASE_API_KEY    "AIzaSyBwnUdxn3n6i0AMXGCIr7HRAa7ClgjE3-A"
#define FIREBASE_DATABASE_URL "https://databasework2026-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_DATABASE_SECRET "YOUR_DATABASE_SECRET"  // Project Settings > Service accounts > Database secrets

#define SESSION_DURATION_MS  30000
#define HEARTBEAT_INTERVAL_MS 10000
#define POLL_INTERVAL_MS    500

// ================= I2C BUSES =================
TwoWire I2C_MAX30205 = TwoWire(0);
TwoWire I2C_MAX30102 = TwoWire(1);

// ================= MAX30205 =================
#define MAX30205_ADDR 0x48
#define REG_TEMP 0x00

// ================= MAX30102 =================
MAX30105 particleSensor;

// ================= GSR =================
#define GSR_PIN 34
uint16_t gsrValue;

// ================= Buffers =================
#define BUFFER_SIZE 100
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];

// ================= Firebase =================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String deviceMac;

// ======================================================
// SIMPLE HR ESTIMATION (IR PEAK METHOD)
// ======================================================
int32_t estimateHeartRate(uint32_t *ir, int n, int sampleRate) {
  uint32_t minv = ir[0], maxv = ir[0];
  for (int i = 1; i < n; i++) {
    minv = min(minv, ir[i]);
    maxv = max(maxv, ir[i]);
  }
  uint32_t threshold = minv + (maxv - minv) * 6 / 10;
  int peaks = 0;
  int lastPeak = -1000;
  int sumIntervals = 0;
  for (int i = 1; i < n - 1; i++) {
    if (ir[i] > threshold && ir[i] > ir[i - 1] && ir[i] > ir[i + 1]) {
      if (i - lastPeak > sampleRate / 4) {
        if (lastPeak >= 0) {
          sumIntervals += i - lastPeak;
          peaks++;
        }
        lastPeak = i;
      }
    }
  }
  if (peaks < 2) return -1;
  return (int32_t)(60.0 * sampleRate / (sumIntervals / (peaks - 1)));
}

// ======================================================
// SIMPLE SpO2 ESTIMATION (RATIO METHOD)
// ======================================================
int32_t estimateSpO2(uint32_t *red, uint32_t *ir, int n) {
  uint32_t redMin = red[0], redMax = red[0];
  uint32_t irMin = ir[0], irMax = ir[0];
  uint64_t redSum = 0, irSum = 0;
  for (int i = 0; i < n; i++) {
    redMin = min(redMin, red[i]);
    redMax = max(redMax, red[i]);
    irMin = min(irMin, ir[i]);
    irMax = max(irMax, ir[i]);
    redSum += red[i];
    irSum += ir[i];
  }
  float redAC = redMax - redMin;
  float irAC = irMax - irMin;
  float redDC = redSum / (float)n;
  float irDC = irSum / (float)n;
  if (irAC == 0 || irDC == 0) return -1;
  float R = (redAC / redDC) / (irAC / irDC);
  int32_t s = 110 - 25 * R;
  return constrain(s, 0, 100);
}

// ======================================================
// MAX30205 TEMPERATURE
// ======================================================
float readMAX30205() {
  I2C_MAX30205.beginTransmission(MAX30205_ADDR);
  I2C_MAX30205.write(REG_TEMP);
  if (I2C_MAX30205.endTransmission(false) != 0) return NAN;
  if (I2C_MAX30205.requestFrom(MAX30205_ADDR, 2) != 2) return NAN;
  int16_t raw = (I2C_MAX30205.read() << 8) | I2C_MAX30205.read();
  return raw / 256.0;
}

// ======================================================
// GET MAC ADDRESS
// ======================================================
void getDeviceMac() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  deviceMac = "";
  for (int i = 0; i < 6; i++) {
    if (mac[i] < 16) deviceMac += "0";
    deviceMac += String(mac[i], HEX);
    if (i < 5) deviceMac += ":";
  }
  deviceMac.toUpperCase();
  Serial.println("Device MAC: " + deviceMac);
}

// ======================================================
// FIREBASE: HEARTBEAT
// ======================================================
void updateHeartbeat() {
  FirebaseJson status;
  status.set("lastSeen/.sv", "timestamp");
  String path = "/devices/" + deviceMac + "/status";
  if (Firebase.RTDB.updateNode(&fbdo, path.c_str(), &status)) {
    Serial.println("Heartbeat ok");
  } else {
    Serial.println("Heartbeat fail: " + fbdo.errorReason());
  }
}

// ======================================================
// FIREBASE: ENSURE DEVICE REGISTERED
// ======================================================
void ensureDeviceRegistered() {
  String path = "/devices/" + deviceMac;
  if (Firebase.RTDB.pathExisted(&fbdo, path.c_str())) {
    Serial.println("Device already registered");
    return;
  }
  FirebaseJson dev;
  dev.set("type", "test");
  dev.set("enabled", true);
  FirebaseJson status;
  status.set("lastSeen/.sv", "timestamp");
  dev.set("status", status);
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &dev)) {
    Serial.println("Device registered: " + deviceMac);
  } else {
    Serial.println("Device register fail: " + fbdo.errorReason());
  }
}

// ======================================================
// FIREBASE: READ DEVICE CONTROL
// ======================================================
bool readDeviceControl(bool &startReading, String &targetDriver) {
  String path = "/deviceControl/" + deviceMac;
  if (!Firebase.RTDB.getJSON(&fbdo, path.c_str())) return false;
  FirebaseJson *json = fbdo.jsonObjectPtr();
  if (!json) return false;
  FirebaseJsonData data;
  json->get(data, "startReading");
  startReading = data.boolValue;
  json->get(data, "targetDriver");
  targetDriver = data.stringValue;
  return true;
}

// ======================================================
// FIREBASE: RESET startReading
// ======================================================
void resetStartReadingFlag() {
  String path = "/deviceControl/" + deviceMac;
  FirebaseJson update;
  update.set("startReading", false);
  Firebase.RTDB.updateNode(&fbdo, path.c_str(), &update);
}

// ======================================================
// COLLECT SESSION & UPLOAD
// ======================================================
void runSession(const String &targetDriver) {
  Serial.println("Starting session for driver: " + targetDriver);
  const int sampleRate = 25;
  unsigned long startTime = millis();

  float tempSum = 0;
  int tempCount = 0;
  uint32_t gsrSum = 0;
  int gsrCount = 0;
  int32_t hrSum = 0;
  int hrCount = 0;
  int32_t spo2Sum = 0;
  int spo2Count = 0;

  while (millis() - startTime < SESSION_DURATION_MS) {
    for (int i = 0; i < BUFFER_SIZE; i++) {
      while (!particleSensor.available()) particleSensor.check();
      redBuffer[i] = particleSensor.getRed();
      irBuffer[i] = particleSensor.getIR();
      particleSensor.nextSample();
    }

    int32_t hr = estimateHeartRate(irBuffer, BUFFER_SIZE, sampleRate);
    int32_t spo2 = estimateSpO2(redBuffer, irBuffer, BUFFER_SIZE);
    float tempC = readMAX30205();
    gsrValue = analogRead(GSR_PIN);

    if (hr > 30 && hr < 220) { hrSum += hr; hrCount++; }
    if (spo2 >= 70 && spo2 <= 100) { spo2Sum += spo2; spo2Count++; }
    if (!isnan(tempC)) { tempSum += tempC; tempCount++; }
    gsrSum += gsrValue;
    gsrCount++;

    Serial.print("Temp:");
    Serial.print(tempC);
    Serial.print(" HR:");
    Serial.print(hr > 0 ? hr : 0);
    Serial.print(" SpO2:");
    Serial.print(spo2 > 0 ? spo2 : 0);
    Serial.print(" GSR:");
    Serial.println(gsrValue);
    delay(50);
  }

  float avgTemp = tempCount > 0 ? tempSum / tempCount : NAN;
  uint32_t avgGsr = gsrCount > 0 ? gsrSum / gsrCount : 0;
  int32_t avgHr = hrCount > 0 ? hrSum / hrCount : -1;
  int32_t avgSpo2 = spo2Count > 0 ? spo2Sum / spo2Count : -1;

  String sessionId = "session_" + String(millis());
  String path = "/sessions/" + targetDriver + "/" + sessionId;

  FirebaseJson session;
  session.set("deviceMac", deviceMac);
  session.set("startTime", startTime / 1000);
  session.set("endTime", millis() / 1000);
  session.set("timestamp/.sv", "timestamp");
  if (!isnan(avgTemp)) session.set("temperature", avgTemp);
  session.set("gsr", (int)avgGsr);
  if (avgHr > 0) session.set("heartRate", (int)avgHr);
  if (avgSpo2 > 0) session.set("spo2", (int)avgSpo2);

  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &session)) {
    Serial.println("Session uploaded: " + path);
  } else {
    Serial.println("Upload fail: " + fbdo.errorReason());
  }
  resetStartReadingFlag();
}

// ======================================================
// SETUP
// ======================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  I2C_MAX30205.begin(21, 22, 100000);
  I2C_MAX30102.begin(25, 26, 400000);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  if (!particleSensor.begin(I2C_MAX30102, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 NOT FOUND");
    while (1) delay(1000);
  }
  particleSensor.setup(60, 4, 2, 25, 411, 4096);
  particleSensor.setPulseAmplitudeRed(60);
  particleSensor.setPulseAmplitudeIR(60);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0 < 15000)) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi FAILED");
    while (1) delay(1000);
  }
  Serial.println("WiFi OK: " + WiFi.localIP().toString());

  getDeviceMac();

  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;
  config.signer.tokens.legacy_token = FIREBASE_DATABASE_SECRET;

  Firebase.reconnectNetwork(true);
  fbdo.setBSSLBufferSize(4096, 1024);
  fbdo.setResponseSize(2048);
  Firebase.begin(&config, &auth);

  Serial.println("Waiting for Firebase...");
  while (!Firebase.ready()) delay(100);
  Serial.println("Firebase OK");

  ensureDeviceRegistered();
  updateHeartbeat();
}

// ======================================================
// LOOP
// ======================================================
void loop() {
  static unsigned long lastHeartbeat = 0;
  static unsigned long lastPoll = 0;

  if (!Firebase.ready()) {
    delay(100);
    return;
  }

  unsigned long now = millis();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    updateHeartbeat();
  }

  if (now - lastPoll >= POLL_INTERVAL_MS) {
    lastPoll = now;
    bool startReading = false;
    String targetDriver;
    if (readDeviceControl(startReading, targetDriver) && startReading && targetDriver.length() > 0) {
      runSession(targetDriver);
    }
  }

  delay(100);
}
