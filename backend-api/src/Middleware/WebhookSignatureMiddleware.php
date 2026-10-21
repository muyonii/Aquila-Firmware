<?php
declare(strict_types=1);

namespace Aquila\Middleware;

use Aquila\Config\Security;

class WebhookSignatureMiddleware
{
    public static function verify(): ?string
    {
        $timestamp = $_SERVER['HTTP_X_AQUILA_TIMESTAMP'] 
            ?? $_SERVER['REDIRECT_HTTP_X_AQUILA_TIMESTAMP'] 
            ?? $_SERVER['REDIRECT_REDIRECT_HTTP_X_AQUILA_TIMESTAMP']
            ?? '';

        $signature = $_SERVER['HTTP_X_AQUILA_SIGNATURE'] 
            ?? $_SERVER['REDIRECT_HTTP_X_AQUILA_SIGNATURE'] 
            ?? $_SERVER['REDIRECT_REDIRECT_HTTP_X_AQUILA_SIGNATURE']
            ?? '';

        if (empty($timestamp) || empty($signature)) {
            $headers = function_exists('getallheaders') 
                ? getallheaders() 
                : (function_exists('apache_request_headers') ? apache_request_headers() : []);

            foreach ($headers as $k => $v) {
                $lowerKey = strtolower((string)$k);
                if ($lowerKey === 'x-aquila-timestamp') $timestamp = (string)$v;
                if ($lowerKey === 'x-aquila-signature') $signature = (string)$v;
            }
        }

        $rawPayload = file_get_contents('php://input');

        if (empty($timestamp) || empty($signature)) {
            self::jsonError(401, "UNAUTHORIZED", "Missing webhook signature or timestamp headers.");
        }

        // Replay attack protection (5-minute tolerance window)
        if (abs(time() - (int)$timestamp) > 300) {
            self::jsonError(401, "TIMESTAMP_EXPIRED", "Webhook timestamp is stale or out of bounds.");
        }

        // Constant-time cryptographic signature verification
        $expectedSignature = hash_hmac('sha256', $timestamp . '.' . $rawPayload, Security::getWebhookSecret());

        if (!hash_equals($expectedSignature, $signature)) {
            self::jsonError(403, "INVALID_SIGNATURE", "Cryptographic signature verification failed.");
        }

        return $rawPayload;
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