#ifndef CIRCULAR_FLASH_BUFFER_H
#define CIRCULAR_FLASH_BUFFER_H
#include <Arduino.h>
#include <LittleFS.h>
#include "IStorageBuffer.h"
#include "config.h"

class CircularFlashBuffer : public IStorageBuffer {
public:
    explicit CircularFlashBuffer(const char* storagePath, uint32_t maxCapacity = 2000);
    ~CircularFlashBuffer() override = default;

    bool begin() override;
    bool push(const TelemetryPayload& payload) override;
    bool pop(TelemetryPayload& payload) override;
    bool isEmpty() const override;
    bool isFull() const override;
    uint32_t count() const override;

private:
    const char* filePath;
    uint32_t capacity;
    uint32_t total;   // records written to the file
    uint32_t head;    // index of next record to read (avoids rewriting the file on every pop)

    void resetStorage();
};
#endif
