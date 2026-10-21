<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Repositories\VerificationCodeRepositoryInterface;
use PDO;

class MySQLVerificationCodeRepository implements VerificationCodeRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    /**
     * Generates a secure 6-digit numeric OTP and stores it
     */
    public function generateOtp(int $userId, string $channel, string $target, int $ttlMinutes = 10): string
    {
        // 1. Invalidate any active pending codes for this user and channel
        $purge = $this->db->prepare(
            "DELETE FROM verification_codes WHERE user_id = :user_id AND channel = :channel"
        );
        $purge->execute([':user_id' => $userId, ':channel' => $channel]);

        // 2. Generate cryptographically random 6-digit numeric code
        $otp = sprintf('%06d', random_int(100000, 999999));
        $expiresAt = date('Y-m-d H:i:s', time() + ($ttlMinutes * 60));

        $stmt = $this->db->prepare(
            "INSERT INTO verification_codes (user_id, channel, target, code, expires_at, created_at)
             VALUES (:user_id, :channel, :target, :code, :expires_at, NOW())"
        );
        $stmt->execute([
            ':user_id'    => $userId,
            ':channel'    => $channel,
            ':target'     => trim($target),
            ':code'       => $otp,
            ':expires_at' => $expiresAt
        ]);

        return $otp;
    }

    /**
     * Validates candidate code; if matched, deletes record and updates user_account
     */
    public function verifyOtp(int $userId, string $channel, string $candidateCode): bool
    {
        $stmt = $this->db->prepare(
            "SELECT id FROM verification_codes 
             WHERE user_id = :user_id 
               AND channel = :channel 
               AND code = :code 
               AND expires_at > NOW() 
             ORDER BY created_at DESC 
             LIMIT 1"
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':channel' => $channel,
            ':code'    => trim($candidateCode)
        ]);
        $recordId = $stmt->fetchColumn();

        if ($recordId === false) {
            return false;
        }

        // Single-use guarantee: consume token immediately
        $delete = $this->db->prepare("DELETE FROM verification_codes WHERE id = :id");
        $delete->execute([':id' => $recordId]);

        // Update corresponding verification timestamp in user_account (Table 3.1)
        if ($channel === 'email') {
            $update = $this->db->prepare("UPDATE user_account SET email_verified_at = NOW() WHERE user_id = :id");
            $update->execute([':id' => $userId]);
        } elseif ($channel === 'whatsapp' || $channel === 'sms') {
            $update = $this->db->prepare("UPDATE user_account SET phone_verified_at = NOW() WHERE user_id = :id");
            $update->execute([':id' => $userId]);
        }

        return true;
    }

    public function purgeExpired(): int
    {
        $stmt = $this->db->query("DELETE FROM verification_codes WHERE expires_at <= NOW()");
        return $stmt->rowCount();
    }
}