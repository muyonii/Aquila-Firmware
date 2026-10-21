<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class VerificationCode
{
    public function __construct(
        public ?int $id,
        public int $userId,
        public string $channel,
        public string $target,
        public string $code,
        public string $expiresAt,
        public ?string $createdAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            id: isset($row['id']) ? (int)$row['id'] : null,
            userId: (int)$row['user_id'],
            channel: (string)$row['channel'],
            target: (string)$row['target'],
            code: (string)$row['code'],
            expiresAt: (string)$row['expires_at'],
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null
        );
    }

    public function isExpired(): bool
    {
        return strtotime($this->expiresAt) <= time();
    }

    public function toArray(): array
    {
        return [
            'id'         => $this->id,
            'user_id'    => $this->userId,
            'channel'    => $this->channel,
            'target'     => $this->target,
            'code'       => $this->code,
            'expires_at' => $this->expiresAt,
            'created_at' => $this->createdAt
        ];
    }
}