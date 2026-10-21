<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class PasswordReset
{
    public function __construct(
        public ?int $resetId,
        public int $userId,
        public string $resetToken,
        public string $ipAddress,
        public bool $isUsed,
        public string $expiresAt,
        public ?string $createdAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            resetId: isset($row['reset_id']) ? (int)$row['reset_id'] : null,
            userId: (int)$row['user_id'],
            resetToken: (string)$row['reset_token'],
            ipAddress: (string)$row['ip_address'],
            isUsed: (bool)($row['is_used'] ?? false),
            expiresAt: (string)$row['expires_at'],
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null
        );
    }

    /**
     * Checks if the token is valid for password restoration
     */
    public function isValid(): bool
    {
        if ($this->isUsed) {
            return false;
        }

        return strtotime($this->expiresAt) > time();
    }

    public function toArray(): array
    {
        return [
            'reset_id'    => $this->resetId,
            'user_id'     => $this->userId,
            'reset_token' => $this->resetToken,
            'ip_address'  => $this->ipAddress,
            'is_used'     => $this->isUsed,
            'expires_at'  => $this->expiresAt,
            'created_at'  => $this->createdAt
        ];
    }
}