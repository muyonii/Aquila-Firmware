<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class SystemNotification
{
    public function __construct(
        public ?int $notificationId,
        public int $userId,
        public ?string $incidentId,
        public string $channel,
        public string $notificationType,
        public string $title,
        public string $message,
        public bool $isRead = false,
        public string $smsStatus = 'NOT_APPLICABLE',
        public ?string $createdAt = null,
        public ?string $readAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            notificationId: isset($row['notification_id']) ? (int)$row['notification_id'] : null,
            userId: (int)$row['user_id'],
            incidentId: isset($row['incident_id']) ? (string)$row['incident_id'] : null,
            channel: (string)($row['channel'] ?? 'IN_APP'),
            notificationType: (string)$row['notification_type'],
            title: (string)$row['title'],
            message: (string)$row['message'],
            isRead: (bool)($row['is_read'] ?? false),
            smsStatus: (string)($row['sms_status'] ?? 'NOT_APPLICABLE'),
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null,
            readAt: isset($row['read_at']) ? (string)$row['read_at'] : null
        );
    }

    public function toArray(): array
    {
        return [
            'notification_id'   => $this->notificationId,
            'user_id'           => $this->userId,
            'incident_id'       => $this->incidentId,
            'channel'           => $this->channel,
            'notification_type' => $this->notificationType,
            'title'             => $this->title,
            'message'           => $this->message,
            'is_read'           => $this->isRead,
            'sms_status'        => $this->smsStatus,
            'created_at'        => $this->createdAt,
            'read_at'           => $this->readAt
        ];
    }
}