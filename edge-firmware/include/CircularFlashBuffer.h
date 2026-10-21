#ifndef CIRCULAR_FLASH_BUFFER_H
#define CIRCULAR_FLASH_BUFFER_H

#include <Arduino.h>
#include <LittleFS.h>
#include "interfaces/IStorageBuffer.h"
#include "config.h"

/**
 * Implements IStorageBuffer using LittleFS.
 * Hides raw filesystem file pointers, sector bounds, and FIFO offsets.
 */
class CircularFlashBuffer : public IStorageBuffer {
public:
    explicit CircularFlashBuffer(const char* storagePath, uint32_t maxCapacity = 2000);
    ~CircularFlashBuffer() override = default;

    // IStorageBuffer interface overrides
    bool begin() override;
    bool push(const TelemetryPayload& payload) override;
    bool pop(TelemetryPayload& payload) override;
    bool isEmpty() const override;
    bool isFull() const override;
    uint32_t count() const override;

private:
    const char* filePath;
    uint32_t capacity;
    uint32_t currentCount;

    // TODO: Private helper to clean and truncate file on corruption
    void resetStorage();
};

#endif // CIRCULAR_FLASH_BUFFER_H