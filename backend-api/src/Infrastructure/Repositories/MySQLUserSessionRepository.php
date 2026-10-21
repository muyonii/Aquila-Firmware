<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\UserSession;
use Aquila\Domain\Repositories\UserSessionRepositoryInterface;
use PDO;

class MySQLUserSessionRepository implements UserSessionRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function createSession(int $userId, string $refreshToken, string $ipAddress, ?string $userAgent, int $ttlDays = 30): UserSession
    {
        $expiresAt = date('Y-m-d H:i:s', time() + ($ttlDays * 86400));
        $sanitizedAgent = $userAgent ? substr(trim($userAgent), 0, 255) : null;
        $sanitizedIp = substr(trim($ipAddress), 0, 45);

        $stmt = $this->db->prepare(
            "INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, expires_at, created_at)
             VALUES (:user_id, :token, :ip, :agent, :expires_at, NOW())"
        );
        $stmt->execute([
            ':user_id'    => $userId,
            ':token'      => $refreshToken,
            ':ip'         => $sanitizedIp,
            ':agent'      => $sanitizedAgent,
            ':expires_at' => $expiresAt
        ]);

        $sessionId = (int)$this->db->lastInsertId();

        return new UserSession(
            sessionId: $sessionId,
            userId: $userId,
            refreshToken: $refreshToken,
            ipAddress: $sanitizedIp,
            userAgent: $sanitizedAgent,
            expiresAt: $expiresAt,
            createdAt: date('Y-m-d H:i:s')
        );
    }

    public function findByRefreshToken(string $refreshToken): ?UserSession
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM user_sessions 
             WHERE refresh_token = :token 
               AND expires_at > NOW() 
             LIMIT 1"
        );
        $stmt->execute([':token' => $refreshToken]);
        $row = $stmt->fetch();

        return $row ? UserSession::fromArray($row) : null;
    }

    public function findActiveByUserId(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM user_sessions 
             WHERE user_id = :user_id 
               AND expires_at > NOW() 
             ORDER BY created_at DESC"
        );
        $stmt->execute([':user_id' => $userId]);
        return array_map(fn($r) => UserSession::fromArray($r), $stmt->fetchAll());
    }

    public function revokeSession(string $refreshToken): void
    {
        $stmt = $this->db->prepare("DELETE FROM user_sessions WHERE refresh_token = :token");
        $stmt->execute([':token' => $refreshToken]);
    }

    public function revokeAllForUser(int $userId): void
    {
        $stmt = $this->db->prepare("DELETE FROM user_sessions WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $userId]);
    }

    public function purgeExpired(): int
    {
        $stmt = $this->db->query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
        return $stmt->rowCount();
    }
}