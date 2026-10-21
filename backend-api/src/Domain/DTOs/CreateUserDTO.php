<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use Aquila\Domain\Enums\UserRole;
use InvalidArgumentException;

readonly class CreateUserDTO
{
    public function __construct(
        public string $firstName,
        public ?string $middleName,
        public string $lastName,
        public string $email,
        public string $password,
        public UserRole $role,
        public ?string $assignedNodeId,
        public ?string $phoneNumber = null,
        public ?string $emergencyContact = null,
        public bool $termsAccepted = true
    ) {}

    public static function fromArray(array $data): self
    {
        $first = trim((string)($data['first_name'] ?? ''));
        $middle = !empty($data['middle_name']) ? trim((string)$data['middle_name']) : null;
        $last = trim((string)($data['last_name'] ?? ''));

        // Fallback for single full_name input
        if (empty($first) && !empty($data['full_name'])) {
            $parts = explode(' ', trim((string)$data['full_name']), 2);
            $first = $parts[0];
            $last = $parts[1] ?? 'User';
        }

        if (empty($first) || strlen($first) > 50) {
            throw new InvalidArgumentException("First name is required and must not exceed 50 characters.");
        }
        if ($middle !== null && strlen($middle) > 50) {
            throw new InvalidArgumentException("Middle name cannot exceed 50 characters.");
        }
        if (empty($last) || strlen($last) > 50) {
            throw new InvalidArgumentException("Last name is required and must not exceed 50 characters.");
        }

        $email = strtolower(trim((string)($data['email'] ?? '')));
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            throw new InvalidArgumentException("A valid email address (max 100 characters) is required.");
        }

        $pass = (string)($data['password'] ?? 'Password123!');
        if (strlen($pass) < 8) {
            throw new InvalidArgumentException("Password must be at least 8 characters long.");
        }

        $roleStr = strtolower(trim((string)($data['role'] ?? 'resident')));
        $role = UserRole::tryFrom($roleStr);
        if ($role === null) {
            throw new InvalidArgumentException("Invalid user role. Allowed: admin, technician, resident.");
        }

        $node = !empty($data['assigned_node_id']) ? strtoupper(trim((string)$data['assigned_node_id'])) : null;
        if ($role->requiresAssignedNode() && empty($node)) {
            throw new InvalidArgumentException("Resident accounts must be assigned to an active monitoring node (RA 10173).");
        }

        $phone = !empty($data['phone_number']) ? trim((string)$data['phone_number']) : null;
        if ($phone !== null && strlen($phone) > 30) {
            throw new InvalidArgumentException("Phone number cannot exceed 30 characters.");
        }

        $emergency = !empty($data['emergency_contact']) ? trim((string)$data['emergency_contact']) : null;
        if ($emergency !== null && strlen($emergency) > 150) {
            throw new InvalidArgumentException("Emergency contact cannot exceed 150 characters.");
        }

        return new self(
            firstName: $first,
            middleName: $middle,
            lastName: $last,
            email: $email,
            password: $pass,
            role: $role,
            assignedNodeId: $role->requiresAssignedNode() ? $node : null,
            phoneNumber: $phone,
            emergencyContact: $emergency,
            termsAccepted: (bool)($data['terms_accepted'] ?? true)
        );
    }
}