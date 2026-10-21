<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use InvalidArgumentException;

readonly class RegisterResidentDTO
{
    public function __construct(
        public string $firstName,
        public ?string $middleName,
        public string $lastName,
        public string $email,
        public string $phoneNumber,
        public string $password,
        public string $assignedNodeId,
        public ?string $meterPin,
        public string $channel
    ) {}

    public static function fromArray(array $data): self
    {
        $first = trim((string)($data['first_name'] ?? ''));
        $middle = !empty($data['middle_name']) ? trim((string)$data['middle_name']) : null;
        $last = trim((string)($data['last_name'] ?? ''));

        if (empty($first) || empty($last)) {
            throw new InvalidArgumentException("First name and last name are required.");
        }

        $email = strtolower(trim((string)($data['email'] ?? '')));
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("A valid email address is required.");
        }

        $phone = trim((string)($data['phone_number'] ?? ''));
        if (empty($phone)) {
            throw new InvalidArgumentException("Mobile phone number is required.");
        }

        $password = (string)($data['password'] ?? '');
        if (strlen($password) < 8) {
            throw new InvalidArgumentException("Password must be at least 8 characters long.");
        }

        $nodeId = strtoupper(trim((string)($data['assigned_node_id'] ?? '')));
        if (empty($nodeId)) {
            throw new InvalidArgumentException("You must select your assigned household water meter.");
        }

        $pin = !empty($data['meter_pin']) ? strtoupper(trim((string)$data['meter_pin'])) : null;
        $channel = strtolower(trim((string)($data['channel'] ?? 'email')));

        if (!in_array($channel, ['email', 'whatsapp', 'sms'], true)) {
            throw new InvalidArgumentException("Invalid OTP delivery channel. Allowed: email, whatsapp, sms.");
        }

        return new self(
            firstName: $first,
            middleName: $middle,
            lastName: $last,
            email: $email,
            phoneNumber: $phone,
            password: $password,
            assignedNodeId: $nodeId,
            meterPin: $pin,
            channel: $channel
        );
    }
}