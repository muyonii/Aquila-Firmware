<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\UserAccount;
use Aquila\Domain\Enums\UserRole;
use Aquila\Domain\Repositories\UserRepositoryInterface;
use PDO;

class MySQLUserRepository implements UserRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findById(int $userId): ?UserAccount
    {
        $stmt = $this->db->prepare("SELECT * FROM user_account WHERE user_id = :id LIMIT 1");
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch();

        return $row ? UserAccount::fromArray($row) : null;
    }

    public function findByEmail(string $email): ?UserAccount
    {
        $stmt = $this->db->prepare("SELECT * FROM user_account WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();

        return $row ? UserAccount::fromArray($row) : null;
    }

    public function findByRole(?UserRole $role = null): array
    {
        $sql = "SELECT * FROM user_account";
        $params = [];
        if ($role !== null) {
            $sql .= " WHERE role = :role";
            $params[':role'] = $role->value;
        }
        $sql .= " ORDER BY created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map(fn($row) => UserAccount::fromArray($row), $stmt->fetchAll());
    }

    public function countAdmins(): int
    {
        $stmt = $this->db->query("SELECT COUNT(*) FROM user_account WHERE role = 'admin' AND is_active = 1");
        return (int)$stmt->fetchColumn();
    }

    public function save(UserAccount $user, ?string $newPasswordHash = null): int
    {
        if ($user->userId > 0) {
            $sql = "UPDATE user_account 
                    SET first_name = :first,
                        middle_name = :middle,
                        last_name = :last,
                        email = :email,
                        role = :role,
                        assigned_node_id = :node,
                        phone_number = :phone,
                        emergency_contact = :emergency,
                        is_active = :active";

            $params = [
                ':first'     => $user->firstName,
                ':middle'    => $user->middleName,
                ':last'      => $user->lastName,
                ':email'     => $user->email,
                ':role'      => $user->role->value,
                ':node'      => $user->assignedNodeId,
                ':phone'     => $user->phoneNumber,
                ':emergency' => $user->emergencyContact,
                ':active'    => $user->isActive ? 1 : 0,
                ':id'        => $user->userId
            ];

            if ($newPasswordHash) {
                $sql .= ", password_hash = :hash";
                $params[':hash'] = $newPasswordHash;
            }

            $sql .= " WHERE user_id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $user->userId;
        }

        $stmt = $this->db->prepare(
            "INSERT INTO user_account 
             (first_name, middle_name, last_name, email, password_hash, role, assigned_node_id, 
              phone_number, emergency_contact, is_active, terms_accepted_at)
             VALUES (:first, :middle, :last, :email, :hash, :role, :node, :phone, :emergency, :active, NOW())"
        );
        $stmt->execute([
            ':first'     => $user->firstName,
            ':middle'    => $user->middleName,
            ':last'      => $user->lastName,
            ':email'     => $user->email,
            ':hash'      => $user->passwordHash,
            ':role'      => $user->role->value,
            ':node'      => $user->assignedNodeId,
            ':phone'     => $user->phoneNumber,
            ':emergency' => $user->emergencyContact,
            ':active'    => $user->isActive ? 1 : 0
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function delete(int $userId): void
    {
        $stmt = $this->db->prepare("DELETE FROM user_account WHERE user_id = :id");
        $stmt->execute([':id' => $userId]);
    }

    public function existsByEmail(string $email): bool
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM user_account WHERE email = :email");
        $stmt->execute([':email' => $email]);
        return (int)$stmt->fetchColumn() > 0;
    }
}