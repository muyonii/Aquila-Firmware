<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\SystemNotification;
use Aquila\Domain\Repositories\SystemNotificationRepositoryInterface;
use PDO;

class MySQLSystemNotificationRepository implements SystemNotificationRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function createNotification(
        int $userId,
        string $notificationType,
        string $title,
        string $message,
        ?string $incidentId = null,
        string $channel = 'IN_APP',
        string $smsStatus = 'NOT_APPLICABLE'
    ): SystemNotification {
        $stmt = $this->db->prepare(
            "INSERT INTO system_notification 
             (user_id, incident_id, channel, notification_type, title, message, is_read, sms_status, created_at)
             VALUES (:user_id, :incident_id, :channel, :type, :title, :message, 0, :sms_status, NOW())"
        );
        $stmt->execute([
            ':user_id'     => $userId,
            ':incident_id' => !empty($incidentId) ? $incidentId : null,
            ':channel'     => $channel,
            ':type'        => $notificationType,
            ':title'       => substr($title, 0, 150),
            ':message'     => $message,
            ':sms_status'  => $smsStatus
        ]);

        $notificationId = (int)$this->db->lastInsertId();

        return new SystemNotification(
            notificationId: $notificationId,
            userId: $userId,
            incidentId: $incidentId,
            channel: $channel,
            notificationType: $notificationType,
            title: $title,
            message: $message,
            isRead: false,
            smsStatus: $smsStatus,
            createdAt: date('Y-m-d H:i:s')
        );
    }

    /**
     * @return SystemNotification[]
     */
    public function findByUserId(int $userId, bool $unreadOnly = false, int $limit = 50): array
    {
        $sql = "SELECT * FROM system_notification WHERE user_id = :user_id";
        if ($unreadOnly) {
            $sql .= " AND is_read = 0";
        }
        $sql .= " ORDER BY created_at DESC LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return array_map(fn($row) => SystemNotification::fromArray($row), $stmt->fetchAll());
    }

    public function markAsRead(int $notificationId, int $userId): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE system_notification 
             SET is_read = 1, read_at = NOW() 
             WHERE notification_id = :id AND user_id = :user_id AND is_read = 0"
        );
        $stmt->execute([':id' => $notificationId, ':user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }

    public function markAllAsReadForUser(int $userId): int
    {
        $stmt = $this->db->prepare(
            "UPDATE system_notification 
             SET is_read = 1, read_at = NOW() 
             WHERE user_id = :user_id AND is_read = 0"
        );
        $stmt->execute([':user_id' => $userId]);

        return $stmt->rowCount();
    }

    public function countUnread(int $userId): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM system_notification WHERE user_id = :user_id AND is_read = 0"
        );
        $stmt->execute([':user_id' => $userId]);

        return (int)$stmt->fetchColumn();
    }
}