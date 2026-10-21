<?php
declare(strict_types=1);

namespace Aquila\Middleware;

use Aquila\Config\Env;

class CorsMiddleware
{
    public static function handle(): void
    {
        $allowedOrigin = Env::get('CORS_ALLOWED_ORIGIN', '*');

        header("Access-Control-Allow-Origin: {$allowedOrigin}");
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Aquila-Signature, X-Aquila-Timestamp, X-Aquila-Internal-Key, X-Requested-With, Accept");
        header("Access-Control-Expose-Headers: Content-Disposition, Content-Length, X-Aquila-Timestamp");
        header("Access-Control-Max-Age: 86400"); // 24-hour preflight cache

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}