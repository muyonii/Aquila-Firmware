<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

use Aquila\Domain\Enums\UserRole;

readonly class UserAccount
{

    public function __construct(
        public int $userId,
        public string $firstName,
        public ?string $middleName,
        public string $lastName,
        public string $fullName,
        public string $email,
        public string $passwordHash,
        public UserRole $role,
        public ?string $assignedNodeId,
        public ?string $phoneNumber = null,
        public ?string $emergencyContact = null,
        public ?string $emailVerifiedAt = null,
        public ?string $phoneVerifiedAt = null,
        public ?string $termsAcceptedAt = null,
        public bool $isActive = true,
        public string $approvalStatus = 'APPROVED',
        public ?string $createdAt = null,
        public ?string $updatedAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            userId: (int)$row['user_id'],
            firstName: (string)$row['first_name'],
            middleName: isset($row['middle_name']) ? (string)$row['middle_name'] : null,
            lastName: (string)$row['last_name'],
            fullName: (string)($row['full_name'] ?? trim("{$row['first_name']} {$row['last_name']}")),
            email: (string)$row['email'],
            passwordHash: (string)$row['password_hash'],
            role: UserRole::from((string)$row['role']),
            assignedNodeId: isset($row['assigned_node_id']) ? (string)$row['assigned_node_id'] : null,
            phoneNumber: isset($row['phone_number']) ? (string)$row['phone_number'] : null,
            emergencyContact: isset($row['emergency_contact']) ? (string)$row['emergency_contact'] : null,
            emailVerifiedAt: isset($row['email_verified_at']) ? (string)$row['email_verified_at'] : null,
            phoneVerifiedAt: isset($row['phone_verified_at']) ? (string)$row['phone_verified_at'] : null,
            termsAcceptedAt: isset($row['terms_accepted_at']) ? (string)$row['terms_accepted_at'] : null,
            isActive: (bool)($row['is_active'] ?? true),
            approvalStatus: (string)($row['approval_status'] ?? 'APPROVED'),
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null,
            updatedAt: isset($row['updated_at']) ? (string)$row['updated_at'] : null
        );
    }

    /**
     * Sanitizes output for JSON responses by stripping password hashes
     */
    public function toSafeArray(): array
    {
        return [
            'user_id'           => $this->userId,
            'first_name'        => $this->firstName,
            'middle_name'       => $this->middleName,
            'last_name'         => $this->lastName,
            'full_name'         => $this->fullName,
            'email'             => $this->email,
            'email_verified'    => $this->emailVerifiedAt !== null,
            'role'              => $this->role->value,
            'assigned_node_id'  => $this->assignedNodeId,
            'phone_number'      => $this->phoneNumber,
            'phone_verified'    => $this->phoneVerifiedAt !== null,
            'emergency_contact' => $this->emergencyContact,
            'terms_accepted_at' => $this->termsAcceptedAt,
            'is_active'         => $this->isActive,
            'approval_status'   => $this->approvalStatus,
            'created_at'        => $this->createdAt
        ];
    }
}