<?php
declare(strict_types=1);

namespace Aquila\Domain\Enums;

enum VerificationChannel: string
{
    case EMAIL = 'email';
    case WHATSAPP = 'whatsapp';
    case SMS = 'sms';

    public function isInstantMessaging(): bool
    {
        return in_array($this, [self::WHATSAPP, self::SMS], true);
    }
}