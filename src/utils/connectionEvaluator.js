import {
    STALE_THRESHOLD,
    OFFLINE_THRESHOLD,
    CONNECTION_STATE,
  } from '../config/constants';
  
  export function evaluateConnection(lastSeen) {
    if (!lastSeen) return CONNECTION_STATE.NO_DATA;
  
    const diff = Date.now() - lastSeen;
  
    if (diff < STALE_THRESHOLD) return CONNECTION_STATE.CONNECTED;
    if (diff < OFFLINE_THRESHOLD) return CONNECTION_STATE.STALE;
    return CONNECTION_STATE.OFFLINE;
  }
  