<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\SystemNotification;

class SystemNotificationTest
{
    public function testDefaultValuesAndState(): void
    {
        $notif = new SystemNotification(
            notificationId: 1,
            userId: 2,
            incidentId: 'test-uuid-001',
            channel: 'IN_APP',
            notificationType: 'CRITICAL_BURST_ALERT',
            title: 'Critical Rupture on NODE-B1-002',
            message: 'Flow velocity spiked to 18.5 LPM.',
            isRead: false
        );

        assert($notif->notificationId === 1);
        assert($notif->userId === 2);
        assert($notif->isRead === false);
        assert($notif->channel === 'IN_APP');
        assert($notif->notificationType === 'CRITICAL_BURST_ALERT');
    }

    public function testFromArrayFactoryHydration(): void
    {
        $row = [
            'notification_id'   => '10',
            'user_id'           => '1',
            'incident_id'       => null,
            'channel'           => 'SMS',
            'notification_type' => 'WORK_ORDER_DISPATCHED',
            'title'             => 'Technician Assigned',
            'message'           => 'Juan Plumber assigned to ticket.',
            'is_read'           => '1',
            'sms_status'        => 'SENT'
        ];

        $entity = SystemNotification::fromArray($row);
        assert($entity->notificationId === 10);
        assert($entity->channel === 'SMS');
        assert($entity->isRead === true);
        assert($entity->smsStatus === 'SENT');
        assert($entity->notificationType === 'WORK_ORDER_DISPATCHED');
    }
}