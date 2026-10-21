<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use InvalidArgumentException;

readonly class ResetPasswordDTO
{
    public function __construct(
        public string $token,
        public string $newPassword
    ) {}

    public static function fromArray(array $data): self
    {
        $token = trim((string)($data['token'] ?? ''));
        $newPassword = (string)($data['new_password'] ?? '');

        if (empty($token)) {
            throw new InvalidArgumentException("Reset token is required.");
        }

        if (strlen($newPassword) < 8) {
            throw new InvalidArgumentException("New password must be at least 8 characters long.");
        }

        return new self($token, $newPassword);
    }
}