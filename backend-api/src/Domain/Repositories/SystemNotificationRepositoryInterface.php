<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\SystemNotification;

interface SystemNotificationRepositoryInterface
{
    public function createNotification(
        int $userId,
        string $notificationType,
        string $title,
        string $message,
        ?string $incidentId = null,
        string $channel = 'IN_APP',
        string $smsStatus = 'NOT_APPLICABLE'
    ): SystemNotification;

    /** @return SystemNotification[] */
    public function findByUserId(int $userId, bool $unreadOnly = false, int $limit = 50): array;

    public function markAsRead(int $notificationId, int $userId): bool;

    public function markAllAsReadForUser(int $userId): int;

    public function countUnread(int $userId): int;
}