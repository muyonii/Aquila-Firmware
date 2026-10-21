<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\Env;

class SmsGatewayService
{
    /**
     * Formats Philippine mobile numbers to international 639XXXXXXXXX format
     */
    public static function formatPhNumber(string $phone): string
    {
        $clean = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($clean, '09') && strlen($clean) === 11) {
            return '63' . substr($clean, 1);
        }
        if (str_starts_with($clean, '639') && strlen($clean) === 12) {
            return $clean;
        }
        return $clean;
    }

    /**
     * Dispatches SMS message via Semaphore API (PH), Twilio, or Demo Simulator
     */
    public static function sendSms(string $recipientPhone, string $message): array
    {
        $isDemo = Env::getBool('DEMO_MODE', true);
        $provider = strtolower(Env::get('SMS_PROVIDER', 'semaphore'));
        $formattedPhone = self::formatPhNumber($recipientPhone);

        // Demo Mode / Simulation
        if ($isDemo || $provider === 'demo') {
            error_log("[AQUILA DEMO SMS] To: {$formattedPhone} | Message: {$message}");
            return [
                "success"  => true,
                "status"   => "SENT",
                "provider" => "DEMO_SIMULATOR",
                "message"  => "SMS simulated successfully in Demo Mode."
            ];
        }

        if ($provider === 'semaphore') {
            return self::sendSemaphore($formattedPhone, $message);
        }

        if ($provider === 'twilio') {
            return self::sendTwilio($formattedPhone, $message);
        }

        return ["success" => false, "status" => "FAILED", "error" => "Unsupported SMS provider."];
    }

    /**
     * Sends SMS via Semaphore API (The #1 Philippine Carrier Gateway)
     */
    private static function sendSemaphore(string $phone, string $message): array
    {
        $apiKey = Env::get('SEMAPHORE_API_KEY');
        $sender = Env::get('SEMAPHORE_SENDER_NAME', 'AQUILA');

        if (empty($apiKey)) {
            return ["success" => false, "status" => "FAILED", "error" => "SEMAPHORE_API_KEY is missing in .env"];
        }

        $ch = curl_init('https://api.semaphore.co/api/v4/messages');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'apikey'     => $apiKey,
                'number'     => $phone,
                'message'    => $message,
                'sendername' => $sender
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            return ["success" => false, "status" => "FAILED", "error" => "cURL Error: " . $curlErr];
        }

        $json = json_decode((string)$response, true);
        $isSent = ($httpCode === 200 && is_array($json) && !empty($json));

        return [
            "success"  => $isSent,
            "status"   => $isSent ? "SENT" : "FAILED",
            "response" => $json ?? $response
        ];
    }

    /**
     * Sends SMS via Twilio API
     */
    private static function sendTwilio(string $phone, string $message): array
    {
        $sid   = Env::get('TWILIO_ACCOUNT_SID');
        $token = Env::get('TWILIO_AUTH_TOKEN');
        $from  = Env::get('TWILIO_FROM_NUMBER');

        if (empty($sid) || empty($token) || empty($from)) {
            return ["success" => false, "status" => "FAILED", "error" => "Twilio credentials missing in .env"];
        }

        $target = str_starts_with($phone, '+') ? $phone : '+' . $phone;
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_USERPWD        => "{$sid}:{$token}",
            CURLOPT_POSTFIELDS     => http_build_query([
                'From' => $from,
                'To'   => $target,
                'Body' => $message
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $isSent = ($httpCode >= 200 && $httpCode < 300);

        return [
            "success" => $isSent,
            "status"  => $isSent ? "SENT" : "FAILED"
        ];
    }
}