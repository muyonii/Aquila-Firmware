#include "CircularFlashBuffer.h"

CircularFlashBuffer::CircularFlashBuffer(const char* storagePath, uint32_t maxCapacity)
    : filePath(storagePath), capacity(maxCapacity), currentCount(0) {}

bool CircularFlashBuffer::begin() {
    // TODO:
    // 1. Mount LittleFS: LittleFS.begin(true) (format if mount fails)
    // 2. Check if filePath exists; if so, count total records = fileSize / sizeof(TelemetryPayload)
    // 3. Initialize currentCount
    return true;
}

bool CircularFlashBuffer::push(const TelemetryPayload& payload) {
    // TODO:
    // 1. Check if isFull(); if so, handle overflow (drop or reject)
    // 2. Open filePath in "ab" (append binary) mode
    // 3. Write raw struct bytes: file.write((const uint8_t*)&payload, sizeof(TelemetryPayload))
    // 4. Close file, increment currentCount
    return true;
}

bool CircularFlashBuffer::pop(TelemetryPayload& payload) {
    // TODO:
    // 1. Check if isEmpty(); return false
    // 2. Open filePath in "rb" (read binary) mode
    // 3. Read first record into payload: file.read((uint8_t*)&payload, sizeof(TelemetryPayload))
    // 4. To shift queue (FIFO): Copy remaining records (offset sizeof(TelemetryPayload))
    //    to a temp file, delete old file, rename temp file to filePath.
    // 5. Decrement currentCount, return true
    return true;
}

bool CircularFlashBuffer::isEmpty() const { return currentCount == 0; }
bool CircularFlashBuffer::isFull() const { return currentCount >= capacity; }
uint32_t CircularFlashBuffer::count() const { return currentCount; }