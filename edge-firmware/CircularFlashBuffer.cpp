#include "CircularFlashBuffer.h"

CircularFlashBuffer::CircularFlashBuffer(const char* storagePath, uint32_t maxCapacity)
    : filePath(storagePath), capacity(maxCapacity), total(0), head(0) {}

bool CircularFlashBuffer::begin() {
    if (!LittleFS.begin(true)) return false;   // format if mount fails
    total = 0;
    head = 0;
    if (LittleFS.exists(filePath)) {
        File f = LittleFS.open(filePath, "r");
        size_t sz = f ? f.size() : 0;
        if (f) f.close();
        if (sz % sizeof(TelemetryPayload) != 0) resetStorage();  // corrupted
        else total = sz / sizeof(TelemetryPayload);
    }
    return true;
}

bool CircularFlashBuffer::push(const TelemetryPayload& payload) {
    if (isFull()) return false;   // reject newest when full
    File f = LittleFS.open(filePath, "a");
    if (!f) return false;
    size_t w = f.write((const uint8_t*)&payload, sizeof(TelemetryPayload));
    f.close();
    if (w != sizeof(TelemetryPayload)) return false;
    total++;
    return true;
}

bool CircularFlashBuffer::pop(TelemetryPayload& payload) {
    if (isEmpty()) return false;
    File f = LittleFS.open(filePath, "r");
    if (!f) { resetStorage(); return false; }
    f.seek((size_t)head * sizeof(TelemetryPayload));
    size_t r = f.read((uint8_t*)&payload, sizeof(TelemetryPayload));
    f.close();
    if (r != sizeof(TelemetryPayload)) { resetStorage(); return false; }
    head++;
    if (head >= total) resetStorage();   // fully drained: delete file, reclaim space
    return true;
}

bool CircularFlashBuffer::isEmpty() const { return head >= total; }
bool CircularFlashBuffer::isFull() const { return total >= capacity; }
uint32_t CircularFlashBuffer::count() const { return total - head; }

void CircularFlashBuffer::resetStorage() {
    LittleFS.remove(filePath);
    total = 0;
    head = 0;
}
