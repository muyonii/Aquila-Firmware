<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use InvalidArgumentException;

readonly class RequestOtpDTO
{
    public function __construct(
        public int $userId,
        public string $channel,
        public string $target
    ) {}

    public static function fromArray(array $data): self
    {
        $userId = (int)($data['user_id'] ?? 0);
        $channel = strtolower(trim((string)($data['channel'] ?? 'email')));
        $target = trim((string)($data['target'] ?? ''));

        if ($userId <= 0) {
            throw new InvalidArgumentException("A valid user_id is required.");
        }

        $allowedChannels = ['email', 'whatsapp', 'sms'];
        if (!in_array($channel, $allowedChannels, true)) {
            throw new InvalidArgumentException("Invalid channel. Allowed: email, whatsapp, sms.");
        }

        if (empty($target)) {
            throw new InvalidArgumentException("Target destination (email address or phone number) is required.");
        }

        return new self($userId, $channel, $target);
    }
}