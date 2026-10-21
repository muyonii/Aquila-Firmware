<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Domain\DTOs\CreateUserDTO;
use Aquila\Domain\Entities\UserAccount;
use Aquila\Domain\Enums\UserRole;
use Aquila\Infrastructure\Repositories\MySQLUserRepository;
use Aquila\Middleware\RoleMiddleware;
use Aquila\Services\AuditLogger;
use InvalidArgumentException;
use PDO;

class UserController
{
    private PDO $db;
    private MySQLUserRepository $userRepo;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->userRepo = new MySQLUserRepository($this->db);
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    // 1. GET /api/v1/users/pending-approvals (List residents waiting for meter binding)
    public function listPendingApprovals(): void
    {
        RoleMiddleware::enforce(UserRole::ADMIN);

        $stmt = $this->db->query(
            "SELECT u.user_id, u.full_name, u.email, u.phone_number, u.assigned_node_id, 
                    u.created_at, n.household_label, n.location_name, n.purok_cluster
             FROM user_account u
             JOIN monitoring_node n ON u.assigned_node_id = n.node_id
             WHERE u.role = 'resident' AND u.approval_status = 'PENDING'
             ORDER BY u.created_at ASC"
        );

        $this->json(200, [
            "success" => true,
            "data" => [
                "pending_count" => $stmt->rowCount(),
                "requests"      => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ]
        ]);
    }

    // 2. PATCH /api/v1/users/{id}/approve-meter (Admin One-Click Meter Binding)
    public function approveResidentMeter(int $userId): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = strtolower(trim((string)($data['action'] ?? 'approve'))); // 'approve' or 'reject'

        $targetUser = $this->userRepo->findById($userId);
        if (!$targetUser || $targetUser->role !== UserRole::RESIDENT) {
            $this->json(404, ["success" => false, "error" => ["code" => "USER_NOT_FOUND", "message" => "Resident account not found."]]);
        }

        $newStatus = ($action === 'reject') ? 'REJECTED' : 'APPROVED';

        $stmt = $this->db->prepare("UPDATE user_account SET approval_status = :status WHERE user_id = :id");
        $stmt->execute([':status' => $newStatus, ':id' => $userId]);

        AuditLogger::log('RESIDENT_METER_APPROVED', (int)$admin['user_id'], null, "Set approval_status = {$newStatus} for user ID {$userId}");

        $this->json(200, [
            "success" => true,
            "data" => [
                "user_id"         => $userId,
                "approval_status" => $newStatus,
                "message"         => "Resident meter assignment has been set to {$newStatus}."
            ]
        ]);
    }

    // 1. GET /api/v1/users (List all accounts with optional role & search filtering)
    public function listUsers(): void
    {
        RoleMiddleware::enforce(UserRole::ADMIN);

        $roleFilter = $_GET['role'] ?? null;
        $searchQuery = trim((string)($_GET['q'] ?? ''));

        $sql = "SELECT u.user_id, u.first_name, u.middle_name, u.last_name, u.full_name, u.email, 
                       u.email_verified_at, u.phone_number, u.phone_verified_at, u.emergency_contact, 
                       u.role, u.terms_accepted_at, u.assigned_node_id, u.is_active, u.created_at, u.updated_at,
                       n.household_label, n.location_name, n.purok_cluster
                FROM user_account u
                LEFT JOIN monitoring_node n ON u.assigned_node_id = n.node_id
                WHERE 1=1";
        
        $params = [];
        if ($roleFilter && in_array(strtolower($roleFilter), ['admin', 'technician', 'resident'], true)) {
            $sql .= " AND u.role = :role";
            $params[':role'] = strtolower($roleFilter);
        }

        if (!empty($searchQuery)) {
            $sql .= " AND (u.full_name LIKE :search OR u.email LIKE :search OR u.phone_number LIKE :search)";
            $params[':search'] = "%{$searchQuery}%";
        }

        $sql .= " ORDER BY u.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        $this->json(200, [
            "success" => true, 
            "data" => [
                "total_users" => count($users), 
                "users"       => $users
            ]
        ]);
    }

    // 2. POST /api/v1/users (Administrative User Provisioning)
    public function createUser(): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);
        $rawBody = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $dto = CreateUserDTO::fromArray($rawBody);
        } catch (InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_INPUT", "message" => $e->getMessage()]]);
        }

        // Email uniqueness check (Table 3.1 AK)
        if ($this->userRepo->existsByEmail($dto->email)) {
            $this->json(409, ["success" => false, "error" => ["code" => "EMAIL_EXISTS", "message" => "Email address is already registered."]]);
        }

        // Phone number uniqueness check (Table 3.1 AK)
        if (!empty($dto->phoneNumber)) {
            $phoneCheck = $this->db->prepare("SELECT COUNT(*) FROM user_account WHERE phone_number = :phone");
            $phoneCheck->execute([':phone' => $dto->phoneNumber]);
            if ((int)$phoneCheck->fetchColumn() > 0) {
                $this->json(409, ["success" => false, "error" => ["code" => "PHONE_EXISTS", "message" => "Phone number is already registered to another account."]]);
            }
        }

        // Bound node verification for resident role (RA 10173)
        if ($dto->assignedNodeId !== null) {
            $nodeCheck = $this->db->prepare("SELECT COUNT(*) FROM monitoring_node WHERE node_id = :node");
            $nodeCheck->execute([':node' => $dto->assignedNodeId]);
            if ((int)$nodeCheck->fetchColumn() === 0) {
                $this->json(400, ["success" => false, "error" => ["code" => "INVALID_NODE", "message" => "Assigned monitoring node '{$dto->assignedNodeId}' does not exist."]]);
            }
        }

        $now = date('Y-m-d H:i:s');
        $hash = password_hash($dto->password, PASSWORD_BCRYPT);

        $newUser = new UserAccount(
            userId: 0,
            firstName: $dto->firstName,
            middleName: $dto->middleName,
            lastName: $dto->lastName,
            fullName: trim("{$dto->firstName} {$dto->lastName}"),
            email: $dto->email,
            passwordHash: $hash,
            role: $dto->role,
            assignedNodeId: $dto->assignedNodeId,
            phoneNumber: $dto->phoneNumber,
            emergencyContact: $dto->emergencyContact,
            emailVerifiedAt: $now, // Administrative creation marks email as verified
            phoneVerifiedAt: null,
            termsAcceptedAt: $now,
            isActive: true,
            createdAt: $now
        );

        $newId = $this->userRepo->save($newUser);
        $savedUser = $this->userRepo->findById($newId);

        AuditLogger::log(
            'USER_CREATED', 
            (int)$admin['user_id'], 
            null, 
            "Created user {$savedUser->email} with role {$savedUser->role->value}"
        );

        $this->json(201, [
            "success" => true,
            "data" => array_merge($savedUser->toSafeArray(), [
                "message" => "User account created successfully."
            ])
        ]);
    }

    // 3. PUT /api/v1/users/{id} (Update Profile, Role, Meter Assignment, or Status)
    public function updateUser(int $userId): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);

        $targetUser = $this->userRepo->findById($userId);
        if (!$targetUser) {
            $this->json(404, ["success" => false, "error" => ["code" => "USER_NOT_FOUND", "message" => "User account not found."]]);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $first  = trim((string)($data['first_name'] ?? $targetUser->firstName));
        $middle = isset($data['middle_name']) ? (empty($data['middle_name']) ? null : trim((string)$data['middle_name'])) : $targetUser->middleName;
        $last   = trim((string)($data['last_name'] ?? $targetUser->lastName));

        if (!empty($data['full_name']) && empty($data['first_name'])) {
            $parts = explode(' ', trim((string)$data['full_name']), 2);
            $first = $parts[0];
            $last = $parts[1] ?? $targetUser->lastName;
        }

        $email = strtolower(trim((string)($data['email'] ?? $targetUser->email)));
        $newRoleStr = strtolower(trim((string)($data['role'] ?? $targetUser->role->value)));
        $newRole = UserRole::tryFrom($newRoleStr) ?? $targetUser->role;
        $nodeId = isset($data['assigned_node_id']) 
            ? ($data['assigned_node_id'] ? strtoupper(trim((string)$data['assigned_node_id'])) : null) 
            : $targetUser->assignedNodeId;

        // Security Guardrail: Last-Admin Lockout Prevention
        if ($targetUser->role === UserRole::ADMIN && $newRole !== UserRole::ADMIN) {
            if ($this->userRepo->countAdmins() <= 1) {
                $this->json(409, [
                    "success" => false,
                    "error" => ["code" => "LAST_ADMIN_LOCKOUT", "message" => "Cannot demote the sole remaining administrator account."]
                ]);
            }
        }

        // RA 10173 Tenant Privacy Validation
        if ($newRole->requiresAssignedNode() && empty($nodeId)) {
            $this->json(400, ["success" => false, "error" => ["code" => "MISSING_NODE", "message" => "Resident role requires an assigned_node_id."]]);
        }
        if (!$newRole->requiresAssignedNode()) {
            $nodeId = null; // Technicians and admins do not require a personal household meter
        }

        if ($nodeId !== null) {
            $nodeCheck = $this->db->prepare("SELECT COUNT(*) FROM monitoring_node WHERE node_id = :node");
            $nodeCheck->execute([':node' => $nodeId]);
            if ((int)$nodeCheck->fetchColumn() === 0) {
                $this->json(400, ["success" => false, "error" => ["code" => "INVALID_NODE", "message" => "Node '{$nodeId}' does not exist."]]);
            }
        }

        $passwordHash = null;
        if (!empty($data['password'])) {
            if (strlen((string)$data['password']) < 8) {
                $this->json(400, ["success" => false, "error" => ["code" => "WEAK_PASSWORD", "message" => "Password must be at least 8 characters long."]]);
            }
            $passwordHash = password_hash((string)$data['password'], PASSWORD_BCRYPT);
        }

        $updatedUser = new UserAccount(
            userId: $userId,
            firstName: $first,
            middleName: $middle,
            lastName: $last,
            fullName: trim("{$first} {$last}"),
            email: $email,
            passwordHash: $passwordHash ?? $targetUser->passwordHash,
            role: $newRole,
            assignedNodeId: $nodeId,
            phoneNumber: isset($data['phone_number']) ? trim((string)$data['phone_number']) : $targetUser->phoneNumber,
            emergencyContact: isset($data['emergency_contact']) ? trim((string)$data['emergency_contact']) : $targetUser->emergencyContact,
            emailVerifiedAt: $targetUser->emailVerifiedAt,
            phoneVerifiedAt: $targetUser->phoneVerifiedAt,
            termsAcceptedAt: $targetUser->termsAcceptedAt,
            isActive: isset($data['is_active']) ? (bool)$data['is_active'] : $targetUser->isActive,
            createdAt: $targetUser->createdAt
        );

        $this->userRepo->save($updatedUser, $passwordHash);

        $freshUser = $this->userRepo->findById($userId);
        AuditLogger::log('USER_UPDATED', (int)$admin['user_id'], null, "Updated user ID {$userId} ({$freshUser->email})");

        $this->json(200, ["success" => true, "data" => $freshUser->toSafeArray()]);
    }

    // 4. DELETE /api/v1/users/{id}
    public function deleteUser(int $userId): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);

        // Security Guardrail: Prevent Self-Deletion
        if ((int)$admin['user_id'] === $userId) {
            $this->json(400, [
                "success" => false, 
                "error" => ["code" => "CANNOT_DELETE_SELF", "message" => "You cannot delete your own active administrator account."]
            ]);
        }

        $target = $this->userRepo->findById($userId);
        if (!$target) {
            $this->json(404, ["success" => false, "error" => ["code" => "USER_NOT_FOUND", "message" => "User account not found."]]);
        }

        // Security Guardrail: Last-Admin Lockout Prevention
        if ($target->role === UserRole::ADMIN && $this->userRepo->countAdmins() <= 1) {
            $this->json(409, [
                "success" => false, 
                "error" => ["code" => "LAST_ADMIN_LOCKOUT", "message" => "Cannot delete the sole remaining administrator account."]
            ]);
        }

        $this->userRepo->delete($userId);
        AuditLogger::log('USER_DELETED', (int)$admin['user_id'], null, "Deleted user ID {$userId} ({$target->email})");

        $this->json(200, ["success" => true, "data" => ["message" => "User ID {$userId} deleted successfully."]]);
    }
}