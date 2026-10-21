<?php
declare(strict_types=1);

namespace Aquila\Middleware;

use Aquila\Config\Database;
use Aquila\Domain\Enums\UserRole;
use PDO;

class RowLevelSecurityMiddleware
{
    /**
     * Enforces strict tenant isolation per RA 10173
     *
     * @return string The authorized node_id to be queried
     */
    public static function enforceTenantIsolation(): string
    {
        $user = JwtAuthMiddleware::authenticate();
        $role = UserRole::tryFrom((string)($user['role'] ?? ''));

        if ($role === null) {
            self::jsonError(403, "INVALID_ROLE", "User token contains an invalid role classification.");
        }

        // Administrators and Technicians can inspect requested nodes across the community
        if ($role === UserRole::ADMIN || $role === UserRole::TECHNICIAN) {
            $requestedNode = strtoupper(trim((string)($_GET['node_id'] ?? '')));
            return !empty($requestedNode) ? $requestedNode : 'NODE-B1-001';
        }

        // Residents are strictly bound to their designated meter under RA 10173
        $assignedNode = strtoupper(trim((string)($user['assigned_node_id'] ?? '')));
        if (empty($assignedNode)) {
            self::jsonError(403, "NO_ASSIGNED_NODE", "Resident account is not bound to any household meter (RA 10173).");
        }

        // Anti-Spoofing: Residents cannot override their assigned meter via query parameters
        return $assignedNode;
    }

    private static function jsonError(int $statusCode, string $errorCode, string $message): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode([
            "success" => false,
            "error" => [
                "code"    => $errorCode,
                "message" => $message
            ]
        ], JSON_PRETTY_PRINT);
        exit;
    }
}