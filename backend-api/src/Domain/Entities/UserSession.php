<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class UserSession
{
    public function __construct(
        public ?int $sessionId,
        public int $userId,
        public string $refreshToken,
        public string $ipAddress,
        public ?string $userAgent,
        public string $expiresAt,
        public ?string $createdAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            sessionId: isset($row['session_id']) ? (int)$row['session_id'] : null,
            userId: (int)$row['user_id'],
            refreshToken: (string)$row['refresh_token'],
            ipAddress: (string)$row['ip_address'],
            userAgent: isset($row['user_agent']) ? (string)$row['user_agent'] : null,
            expiresAt: (string)$row['expires_at'],
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null
        );
    }

    /**
     * Verifies if the session is still active and within expiration bounds
     */
    public function isExpired(): bool
    {
        return strtotime($this->expiresAt) <= time();
    }

    public function toArray(): array
    {
        return [
            'session_id'    => $this->sessionId,
            'user_id'       => $this->userId,
            'refresh_token' => $this->refreshToken,
            'ip_address'    => $this->ipAddress,
            'user_agent'    => $this->userAgent,
            'expires_at'    => $this->expiresAt,
            'created_at'    => $this->createdAt
        ];
    }
}