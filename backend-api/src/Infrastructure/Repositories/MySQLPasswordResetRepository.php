<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\PasswordReset;
use Aquila\Domain\Repositories\PasswordResetRepositoryInterface;
use PDO;

class MySQLPasswordResetRepository implements PasswordResetRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function createResetRequest(int $userId, string $hashedToken, string $ipAddress, int $ttlSeconds = 3600): PasswordReset
    {
        // 1. Invalidate any prior unused reset tokens for this user
        $this->purgeExpiredForUser($userId);

        // 2. Insert new token record
        $expiresAt = date('Y-m-d H:i:s', time() + $ttlSeconds);
        $stmt = $this->db->prepare(
            "INSERT INTO password_reset (user_id, reset_token, ip_address, is_used, expires_at, created_at)
             VALUES (:user_id, :token, :ip, 0, :expires_at, NOW())"
        );
        $stmt->execute([
            ':user_id'    => $userId,
            ':token'      => $hashedToken,
            ':ip'         => substr($ipAddress, 0, 45),
            ':expires_at' => $expiresAt
        ]);

        $resetId = (int)$this->db->lastInsertId();

        return new PasswordReset(
            resetId: $resetId,
            userId: $userId,
            resetToken: $hashedToken,
            ipAddress: $ipAddress,
            isUsed: false,
            expiresAt: $expiresAt,
            createdAt: date('Y-m-d H:i:s')
        );
    }

    public function findActiveByToken(string $hashedToken): ?PasswordReset
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM password_reset 
             WHERE reset_token = :token 
               AND is_used = 0 
               AND expires_at > NOW() 
             ORDER BY created_at DESC 
             LIMIT 1"
        );
        $stmt->execute([':token' => $hashedToken]);
        $row = $stmt->fetch();

        return $row ? PasswordReset::fromArray($row) : null;
    }

    public function markAsUsed(int $resetId): void
    {
        $stmt = $this->db->prepare("UPDATE password_reset SET is_used = 1 WHERE reset_id = :id");
        $stmt->execute([':id' => $resetId]);
    }

    public function purgeExpiredForUser(int $userId): void
    {
        // Mark all older open requests as used
        $stmt = $this->db->prepare("UPDATE password_reset SET is_used = 1 WHERE user_id = :user_id AND is_used = 0");
        $stmt->execute([':user_id' => $userId]);
    }
}