import { ref, onValue, set, update, get } from 'firebase/database';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { db, auth } from '../firebase';

// ---- Device control (ESP32 listens here) ----
export const listenDeviceStatus = (mac, cb) => {
  const r = ref(db, `devices/${mac}/status`);
  const unsub = onValue(r, (snap) => cb(snap.val()));
  return () => unsub();
};

export const startReading = (mac, payload) =>
  set(ref(db, `deviceControl/${mac}`), payload);

export const stopReading = (mac) =>
  update(ref(db, `deviceControl/${mac}`), { startReading: false });

export const listenDeviceControl = (mac, cb) => {
  const r = ref(db, `deviceControl/${mac}`);
  const unsub = onValue(r, (snap) => cb(snap.val()));
  return () => unsub();
};

// ---- Users (role + active; used after login) ----
export const getUserRole = (uid) =>
  get(ref(db, `users/${uid}`)).then((snap) => snap.val());

/** Try sign-in; if admin user doesn't exist, create it and set admin role. */
export const signInOrCreateAdmin = async (adminEmail, adminPassword) => {
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    return;
  } catch (e) {
    const code = e?.code || '';
    if (code !== 'auth/invalid-credential' && code !== 'auth/user-not-found' && code !== 'auth/invalid-login-credentials') {
      throw e;
    }
  }
  try {
    const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    await set(ref(db, `users/${userCred.user.uid}`), { role: 'admin', active: true });
    return;
  } catch (createErr) {
    const createCode = createErr?.code || '';
    if (createCode === 'auth/email-already-in-use') {
      throw new Error('Invalid password for admin. Use the correct password.');
    }
    throw createErr;
  }
};

export const listenUser = (uid, cb, onError) => {
  const r = ref(db, `users/${uid}`);
  const unsub = onValue(r, (snap) => cb(snap.val()), (err) => {
    if (onError) onError(err);
    else cb(null);
  });
  return () => unsub();
};

// ---- Drivers (admin list + create/disable) ----
export const listenDrivers = (cb) => {
  const r = ref(db, 'drivers');
  const unsub = onValue(r, (snap) => cb(snap.val() || {}));
  return () => unsub();
};

export const createDriverUser = async (email, password, username, adminPassword) => {
  const admin = auth.currentUser;
  if (!admin?.email || !adminPassword) {
    throw new Error('Admin session lost. Please log in again.');
  }
  const adminEmail = admin.email;

  // Verify admin password first (before creating driver - avoids orphaned accounts)
  const cred = EmailAuthProvider.credential(adminEmail, adminPassword);
  try {
    await reauthenticateWithCredential(admin, cred);
  } catch (e) {
    if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password') {
      throw new Error(`Incorrect password for ${adminEmail}. Use the password you used to log in.`);
    }
    if (e?.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Wait a few minutes and try again.');
    }
    throw e;
  }

  let uid;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    uid = userCred.user.uid;
  } catch (createErr) {
    const code = createErr?.code || '';
    if (code === 'auth/email-already-in-use') {
      // Link existing Auth user: sign in with provided password to get UID, then add to DB
      try {
        const linkCred = await signInWithEmailAndPassword(auth, email, password);
        uid = linkCred.user.uid;
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword); // switch back to admin
      } catch (linkErr) {
        if (linkErr?.code === 'auth/invalid-credential' || linkErr?.code === 'auth/wrong-password') {
          throw new Error('That email already exists in Firebase. Enter the current password for that account to link it.');
        }
        throw linkErr;
      }
    } else if (code === 'auth/weak-password') {
      throw new Error('Driver password is too weak. Use at least 6 characters.');
    } else {
      throw createErr;
    }
  }

  // If we created new user, we're signed in as them - sign back as admin
  if (auth.currentUser?.uid !== admin.uid) {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  }
  await set(ref(db, `users/${uid}`), { role: 'driver', active: true });
  await set(ref(db, `drivers/${uid}`), { username, email, active: true });
  if (username) {
    await set(ref(db, `usernames/${username}`), uid);
  }
  return uid;
};

export const disableDriver = (uid) =>
  update(ref(db, `drivers/${uid}`), { active: false }).then(() =>
    update(ref(db, `users/${uid}`), { active: false })
  );

// ---- Devices (MAC list, assigned / test) ----
export const listenDevices = (cb) => {
  const r = ref(db, 'devices');
  const unsub = onValue(r, (snap) => cb(snap.val() || {}));
  return () => unsub();
};

export const setDeviceAssigned = (mac, driverUid) =>
  update(ref(db, `devices/${mac}`), {
    type: 'assigned',
    assignedDriver: driverUid,
  });

export const setDeviceTest = (mac) =>
  update(ref(db, `devices/${mac}`), { type: 'test', assignedDriver: null });

// ---- Sessions (per-driver readings) ----
// Reads from /sessions/{uid} (primary) and /driverData/{uid}/sessions (legacy) - merged by session ID
function mergeSessionData(primary = {}, legacy = {}) {
  const merged = { ...primary };
  Object.entries(legacy || {}).forEach(([id, v]) => {
    if (!merged[id]) merged[id] = v;
  });
  return merged;
}

export const listenSessions = (driverUid, cb) => {
  const rPrimary = ref(db, `sessions/${driverUid}`);
  const rLegacy = ref(db, `driverData/${driverUid}/sessions`);
  let lastPrimary = {};
  let lastLegacy = {};
  const emit = () => cb(mergeSessionData(lastPrimary, lastLegacy));
  const unsub1 = onValue(rPrimary, (snap) => {
    lastPrimary = snap.val() || {};
    emit();
  });
  const unsub2 = onValue(rLegacy, (snap) => {
    lastLegacy = snap.val() || {};
    emit();
  }, () => {}); // ignore legacy read errors (path may not exist)
  return () => {
    unsub1();
    unsub2();
  };
};

export const getSessions = (driverUid) =>
  get(ref(db, `sessions/${driverUid}`)).then((snap) => snap.val() || {});

export const listenLatestSession = (driverUid, cb) => {
  const rPrimary = ref(db, `sessions/${driverUid}`);
  const rLegacy = ref(db, `driverData/${driverUid}/sessions`);
  let lastPrimary = {};
  let lastLegacy = {};
  const pickLatest = () => {
    const merged = mergeSessionData(lastPrimary, lastLegacy);
    const ids = Object.keys(merged);
    if (ids.length === 0) return cb(null);
    const sorted = [...ids].sort((a, b) => (merged[b].timestamp || 0) - (merged[a].timestamp || 0));
    cb(merged[sorted[0]]);
  };
  const unsub1 = onValue(rPrimary, (snap) => {
    lastPrimary = snap.val() || {};
    pickLatest();
  });
  const unsub2 = onValue(rLegacy, (snap) => {
    lastLegacy = snap.val() || {};
    pickLatest();
  }, () => {});
  return () => {
    unsub1();
    unsub2();
  };
};
