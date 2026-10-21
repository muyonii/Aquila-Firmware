<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\Env;

class EmailGatewayService
{
    /**
     * Dispatches an HTML Email via SMTP or native mailer
     */
    public static function sendEmail(string $recipientEmail, string $subject, string $htmlBody): bool
    {
        $isDemo = Env::getBool('DEMO_MODE', true);
        $driver = strtolower(Env::get('MAIL_DRIVER', 'smtp'));

        if ($isDemo || $driver === 'demo') {
            error_log("[AQUILA DEMO EMAIL] To: {$recipientEmail} | Subject: {$subject}");
            return true;
        }

        $fromEmail = Env::get('MAIL_FROM_ADDRESS', 'no-reply@bawasa.gov.ph');
        $fromName  = Env::get('MAIL_FROM_NAME', 'AQUILA Water System');

        if ($driver === 'smtp') {
            return self::sendSmtp($recipientEmail, $subject, $htmlBody, $fromEmail, $fromName);
        }

        // Native PHP mail() fallback
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        return @mail($recipientEmail, $subject, $htmlBody, $headers);
    }

    /**
     * Zero-Dependency Socket SMTP Client (Works with Gmail, Mailtrap, SendGrid)
     */
    private static function sendSmtp(string $to, string $subject, string $htmlBody, string $fromEmail, string $fromName): bool
    {
        $host       = Env::get('MAIL_HOST', 'smtp.gmail.com');
        $port       = Env::getInt('MAIL_PORT', 587);
        $username   = Env::get('MAIL_USERNAME');
        $password   = Env::get('MAIL_PASSWORD');
        $encryption = strtolower(Env::get('MAIL_ENCRYPTION', 'tls'));

        if (empty($username) || empty($password)) {
            $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: {$fromName} <{$fromEmail}>\r\n";
            return @mail($to, $subject, $htmlBody, $headers);
        }

        try {
            $socketHost = ($encryption === 'ssl') ? "ssl://{$host}" : $host;
            $socket = @fsockopen($socketHost, $port, $errno, $errstr, 8);

            if (!$socket) return false;

            fgets($socket, 512);
            fputs($socket, "EHLO {$host}\r\n");
            fgets($socket, 512);

            if ($encryption === 'tls') {
                fputs($socket, "STARTTLS\r\n");
                fgets($socket, 512);
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                fputs($socket, "EHLO {$host}\r\n");
                fgets($socket, 512);
            }

            fputs($socket, "AUTH LOGIN\r\n");
            fgets($socket, 512);
            fputs($socket, base64_encode($username) . "\r\n");
            fgets($socket, 512);
            fputs($socket, base64_encode($password) . "\r\n");
            $authRes = fgets($socket, 512);

            if (!str_starts_with($authRes, '235')) {
                fclose($socket);
                return false;
            }

            fputs($socket, "MAIL FROM: <{$fromEmail}>\r\n");
            fgets($socket, 512);
            fputs($socket, "RCPT TO: <{$to}>\r\n");
            fgets($socket, 512);
            fputs($socket, "DATA\r\n");
            fgets($socket, 512);

            $content  = "Subject: {$subject}\r\n";
            $content .= "From: {$fromName} <{$fromEmail}>\r\n";
            $content .= "To: <{$to}>\r\n";
            $content .= "MIME-Version: 1.0\r\n";
            $content .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
            $content .= $htmlBody . "\r\n.\r\n";

            fputs($socket, $content);
            fgets($socket, 512);

            fputs($socket, "QUIT\r\n");
            fclose($socket);

            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Generates HTML Email with AQUILA Branding
     */
    public static function buildHtmlTemplate(string $title, string $bodyContent, ?string $actionUrl = null, string $actionText = 'Open AQUILA'): string
    {
        $buttonHtml = $actionUrl ? "
            <table border='0' cellpadding='0' cellspacing='0' style='margin-top: 24px;'>
                <tr>
                    <td align='center' bgcolor='#0284c7' style='border-radius: 6px;'>
                        <a href='{$actionUrl}' target='_blank' style='display: inline-block; padding: 12px 24px; font-family: sans-serif; font-size: 14px; color: #ffffff; text-decoration: none; font-weight: bold;'>{$actionText}</a>
                    </td>
                </tr>
            </table>
        " : "";

        return "
        <!DOCTYPE html>
        <html>
        <head><meta charset='utf-8'></head>
        <body style='font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e2e8f0;'>
                <div style='border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px;'>
                    <h2 style='color: #0284c7; margin: 0; font-size: 20px;'>AQUILA Smart Water System</h2>
                    <p style='color: #64748b; margin: 4px 0 0 0; font-size: 12px;'>BAWASA Community Decision Support System</p>
                </div>
                <h3 style='color: #1e293b; margin-top: 0;'>{$title}</h3>
                <div style='color: #334155; font-size: 14px; line-height: 1.6;'>
                    {$bodyContent}
                </div>
                {$buttonHtml}
                <div style='margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center;'>
                    This is an automated operational message generated by AQUILA.<br>
                    BPSU BSCS Capstone Defense 2026 &copy; BAWASA Water Utility
                </div>
            </div>
        </body>
        </html>
        ";
    }
}