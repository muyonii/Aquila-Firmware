<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use InvalidArgumentException;

readonly class ForgotPasswordDTO
{
    public function __construct(
        public string $email
    ) {}

    public static function fromArray(array $data): self
    {
        $email = trim((string)($data['email'] ?? ''));

        if (empty($email)) {
            throw new InvalidArgumentException("Email address is required.");
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("A valid email address is required.");
        }

        return new self($email);
    }
}