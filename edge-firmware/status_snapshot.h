#ifndef STATUS_SNAPSHOT_H
#define STATUS_SNAPSHOT_H
#include <stdint.h>

// Latest values shared between tasks (written by sensing/network tasks, read by the web UI).
struct StatusSnapshot {
    volatile float flowLpm = 0.0f;
    volatile float totalLiters = 0.0f;
    volatile float batteryVolts = 0.0f;
    volatile uint32_t sequence = 0;
    volatile uint32_t lastTimestamp = 0;
    volatile uint32_t backlog = 0;
    volatile bool cloudOk = false;                 // last live upload to Firebase succeeded
    volatile bool resetOdometerRequested = false;  // set by web UI, handled by sensing task
};
#endif
