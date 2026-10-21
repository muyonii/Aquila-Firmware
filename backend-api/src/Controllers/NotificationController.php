<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Infrastructure\Repositories\MySQLSystemNotificationRepository;
use Aquila\Middleware\JwtAuthMiddleware;
use PDO;

class NotificationController
{
    private MySQLSystemNotificationRepository $notifRepo;

    public function __construct()
    {
        $this->notifRepo = new MySQLSystemNotificationRepository(Database::getConnection());
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    // GET /api/v1/notifications
    public function getMyNotifications(): void
    {
        $user = JwtAuthMiddleware::authenticate();
        $userId = (int)$user['user_id'];
        $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';

        $notifications = $this->notifRepo->findByUserId($userId, $unreadOnly);
        $unreadCount = $this->notifRepo->countUnread($userId);

        $this->json(200, [
            "success" => true,
            "data" => [
                "unread_count"  => $unreadCount,
                "notifications" => array_map(fn($n) => $n->toArray(), $notifications)
            ]
        ]);
    }

    // PATCH /api/v1/notifications/{id}/read
    public function markAsRead(int $notificationId): void
    {
        $user = JwtAuthMiddleware::authenticate();
        $userId = (int)$user['user_id'];

        $updated = $this->notifRepo->markAsRead($notificationId, $userId);

        $this->json(200, [
            "success" => true,
            "data" => [
                "notification_id" => $notificationId,
                "marked_read"     => $updated
            ]
        ]);
    }

    // PATCH /api/v1/notifications/read-all
    public function markAllAsRead(): void
    {
        $user = JwtAuthMiddleware::authenticate();
        $userId = (int)$user['user_id'];

        $count = $this->notifRepo->markAllAsReadForUser($userId);

        $this->json(200, [
            "success" => true,
            "data" => [
                "marked_read_count" => $count,
                "message"           => "All notifications marked as read."
            ]
        ]);
    }
}