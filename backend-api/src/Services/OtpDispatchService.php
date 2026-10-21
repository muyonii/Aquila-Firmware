<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Infrastructure\Repositories\MySQLVerificationCodeRepository;

class OtpDispatchService
{
    private MySQLVerificationCodeRepository $verifRepo;

    public function __construct()
    {
        $this->verifRepo = new MySQLVerificationCodeRepository(Database::getConnection());
    }

    public function dispatchOtp(int $userId, string $channel, string $target): array
    {
        $otp = $this->verifRepo->generateOtp($userId, $channel, $target, AppConfig::OTP_TTL_MINUTES);

        AuditLogger::log('OTP_DISPATCHED', $userId, null, "Generated {$channel} OTP for target: {$target}");

        $isDemo = Env::getBool('DEMO_MODE', false);
        $smtpConfigured = !empty(Env::get('MAIL_USERNAME')) && !str_contains((string)Env::get('MAIL_USERNAME'), 'your.aquila.sender');
        $dispatched = false;

        if ($channel === 'sms' || $channel === 'whatsapp') {
            $smsMsg = "Your AQUILA verification code is: {$otp}. Valid for 10 minutes. Do not share this code.";
            $smsRes = SmsGatewayService::sendSms($target, $smsMsg);
            $dispatched = $smsRes['success'];
        } else {
            $emailHtml = EmailGatewayService::buildHtmlTemplate(
                "Verify your AQUILA email address",
                "<p>Enter the following 6-digit security code to verify your account:</p>
                 <div style='margin: 24px 0; padding: 18px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; text-align: center;'>
                     <span style='font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7;'>{$otp}</span>
                 </div>
                 <p style='font-size: 13px; color: #64748b;'>This code expires in 10 minutes.</p>"
            );
            $dispatched = EmailGatewayService::sendEmail($target, "{$otp} is your AQUILA verification code", $emailHtml);
        }

        return [
            "success"         => true,
            "channel"         => $channel,
            "target"          => $target,
            "ttl_minutes"     => AppConfig::OTP_TTL_MINUTES,
            "smtp_configured" => $smtpConfigured,
            "dispatched"      => $dispatched,
            "demo_otp"        => (!$smtpConfigured || $isDemo) ? $otp : null
        ];
    }
}