<?php
declare(strict_types=1);

namespace Aquila\Middleware;

use Aquila\Domain\Enums\UserRole;

class RoleMiddleware
{
    /**
     * Enforces that authenticated user possesses at least one of the allowed roles
     */
    public static function enforce(UserRole ...$allowedRoles): array
    {
        $currentUser = JwtAuthMiddleware::authenticate();
        $userRole = UserRole::tryFrom((string)($currentUser['role'] ?? ''));

        if ($userRole === null || !in_array($userRole, $allowedRoles, true)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                "success" => false,
                "error" => [
                    "code"    => "FORBIDDEN",
                    "message" => "Access denied. Operation requires role: " . implode(', ', array_map(fn($r) => $r->value, $allowedRoles))
                ]
            ], JSON_PRETTY_PRINT);
            exit;
        }

        return $currentUser;
    }
}