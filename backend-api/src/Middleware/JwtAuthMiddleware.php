<?php
declare(strict_types=1);

namespace Aquila\Middleware;

use Aquila\Config\Database;
use Aquila\Config\Security;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Exception;
use PDO;

class JwtAuthMiddleware
{
    public static function authenticate(): array
    {
        $authHeader = '';

        // 1. Check all standard and Apache rewritten environment keys
        $keys = [
            'HTTP_AUTHORIZATION',
            'REDIRECT_HTTP_AUTHORIZATION',
            'REDIRECT_REDIRECT_HTTP_AUTHORIZATION',
            'HTTP_X_AUTHORIZATION',
            'REDIRECT_HTTP_X_AUTHORIZATION',
            'PHP_AUTH_BEARER',
            'AUTHORIZATION'
        ];

        foreach ($keys as $k) {
            if (!empty($_SERVER[$k])) {
                $authHeader = (string)$_SERVER[$k];
                break;
            }
        }

        // 2. Check getallheaders() / apache_request_headers()
        if (empty($authHeader)) {
            $headers = function_exists('getallheaders') 
                ? getallheaders() 
                : (function_exists('apache_request_headers') ? apache_request_headers() : []);

            foreach ($headers as $key => $val) {
                $lowerKey = strtolower((string)$key);
                if ($lowerKey === 'authorization' || $lowerKey === 'x-authorization') {
                    $authHeader = (string)$val;
                    break;
                }
            }
        }

        // 3. Fallback to apache_getenv
        if (empty($authHeader) && function_exists('apache_getenv')) {
            $authHeader = apache_getenv('HTTP_AUTHORIZATION') 
                ?: (apache_getenv('REDIRECT_HTTP_AUTHORIZATION') ?: '');
        }

        // 4. Validate header presence and Bearer format
        if (empty($authHeader) || !preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            self::jsonError(401, "UNAUTHORIZED", "Missing or malformed Bearer authorization token.");
        }

        $jwt = $matches[1];

        try {
            $decoded = JWT::decode($jwt, new Key(Security::getJwtSecret(), Security::JWT_ALGORITHM));
            $userData = (array)$decoded->data;

            // 5. Active Account Invariant (Table 3.1): Ensure user was not deactivated during token window
            $userId = (int)($userData['user_id'] ?? 0);
            if ($userId > 0) {
                $db = Database::getConnection();
                $stmt = $db->prepare("SELECT is_active FROM user_account WHERE user_id = :id");
                $stmt->execute([':id' => $userId]);
                $isActive = $stmt->fetchColumn();

                if ($isActive === false || (int)$isActive === 0) {
                    self::jsonError(403, "ACCOUNT_DEACTIVATED", "This user account has been deactivated or suspended.");
                }
            }

            return $userData;

        } catch (ExpiredException $e) {
            // CRITICAL FOR TABLE 3.3: Signals the client to call POST /api/v1/auth/refresh
            self::jsonError(401, "TOKEN_EXPIRED", "Access token has expired. Please refresh session.");
        } catch (Exception $e) {
            self::jsonError(401, "TOKEN_INVALID", "Token signature is invalid: " . $e->getMessage());
        }

        return [];
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