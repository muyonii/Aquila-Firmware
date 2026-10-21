<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use InvalidArgumentException;

readonly class VerifyOtpDTO
{
    public function __construct(
        public int $userId,
        public string $channel,
        public string $code
    ) {}

    public static function fromArray(array $data): self
    {
        $userId = (int)($data['user_id'] ?? 0);
        $channel = strtolower(trim((string)($data['channel'] ?? 'email')));
        $code = trim((string)($data['code'] ?? ''));

        if ($userId <= 0) {
            throw new InvalidArgumentException("A valid user_id is required.");
        }

        $allowedChannels = ['email', 'whatsapp', 'sms'];
        if (!in_array($channel, $allowedChannels, true)) {
            throw new InvalidArgumentException("Invalid delivery channel. Allowed: email, whatsapp, sms.");
        }

        if (empty($code)) {
            throw new InvalidArgumentException("Verification code cannot be empty.");
        }

        if (strlen($code) < 4 || strlen($code) > 64) {
            throw new InvalidArgumentException("Invalid verification code length.");
        }

        return new self($userId, $channel, $code);
    }
}