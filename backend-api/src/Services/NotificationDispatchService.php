<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\NotificationType;
use Aquila\Domain\Enums\UserRole;
use Aquila\Infrastructure\Repositories\MySQLSystemNotificationRepository;
use Aquila\Infrastructure\Repositories\MySQLUserRepository;
use PDO;

class NotificationDispatchService
{
    private PDO $db;
    private MySQLSystemNotificationRepository $notifRepo;
    private MySQLUserRepository $userRepo;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
        $this->notifRepo = new MySQLSystemNotificationRepository($this->db);
        $this->userRepo = new MySQLUserRepository($this->db);
    }

    /**
     * Helper: Sends In-App Web Notification to ALL active Administrators
     */
    private function notifyAllAdmins(string $type, string $title, string $message, ?string $incidentId = null): void
    {
        $admins = $this->userRepo->findByRole(UserRole::ADMIN);
        foreach ($admins as $admin) {
            $this->notifRepo->createNotification(
                userId: $admin->userId,
                notificationType: $type,
                title: $title,
                message: $message,
                incidentId: $incidentId,
                channel: 'IN_APP',
                smsStatus: 'NOT_APPLICABLE'
            );
        }
    }

    // =========================================================================
    // 1. ADMIN NOTIFICATION METHODS
    // =========================================================================

    /**
     * ADMIN EVENT 1: P1 Critical Pipe Rupture Alert (Web + SMS to all Admins)
     */
    public function notifyBurstAlert(IncidentTicket $ticket): void
    {
        $title = "CRITICAL BURST: Meter {$ticket->nodeId}";
        $message = "High-velocity pipe rupture detected on meter {$ticket->nodeId} at {$ticket->detectedAt}. Immediate field inspection required.";

        // Web Alert to all Admins
        $this->notifyAllAdmins(NotificationType::CRITICAL_BURST_ALERT->value, $title, $message, $ticket->incidentId);

        // Outbound SMS to Admins with registered phone numbers
        $admins = $this->userRepo->findByRole(UserRole::ADMIN);
        foreach ($admins as $admin) {
            if (!empty($admin->phoneNumber)) {
                $this->dispatchSms($admin->userId, $ticket->incidentId, NotificationType::CRITICAL_BURST_ALERT->value, $admin->phoneNumber, $title, $message);
            }
        }
    }

    /**
     * ADMIN EVENT 2: Resident Concern Filed
     */
    public function notifyResidentConcern(IncidentTicket $ticket, string $residentName, string $concernText): void
    {
        $title = "RESIDENT CONCERN: Meter {$ticket->nodeId}";
        $message = "Resident {$residentName} submitted a water concern for meter {$ticket->nodeId}: \"{$concernText}\". Work order generated.";

        $this->notifyAllAdmins('SYSTEM_UPDATE', $title, $message, $ticket->incidentId);
    }

    /**
     * ADMIN EVENT 3: Technician Completed Repair (Commences 15-min observation)
     */
    public function notifyRepairSubmitted(IncidentTicket $ticket, string $technicianName): void
    {
        $title = "REPAIR SUBMITTED: Meter {$ticket->nodeId}";
        $message = "Technician {$technicianName} completed field repair on {$ticket->nodeId}. Ticket entered 15-minute post-repair flow observation.";

        $this->notifyAllAdmins('SYSTEM_UPDATE', $title, $message, $ticket->incidentId);
    }

    /**
     * ADMIN EVENT 4: Post-Repair Verification Success (Auto-Closed)
     */
    public function notifyRepairSuccess(IncidentTicket $ticket): void
    {
        $title = "VERIFIED RESOLVED: Meter {$ticket->nodeId}";
        $message = "Post-repair 15-minute verification SUCCESS on meter {$ticket->nodeId}. Flow remained quiescent (<= 0.05 LPM). Ticket closed.";

        $this->notifyAllAdmins('SYSTEM_UPDATE', $title, $message, $ticket->incidentId);
    }

    /**
     * ADMIN EVENT 5: Post-Repair Verification Failure (Web + SMS)
     */
    public function notifyRepairFailed(IncidentTicket $ticket): void
    {
        $title = "REPAIR FAILED: Meter {$ticket->nodeId}";
        $message = "Post-repair 15-minute verification FAILED on meter {$ticket->nodeId}. Recurrent flow detected. Ticket returned to active queue.";

        // Web Alert to all Admins
        $this->notifyAllAdmins(NotificationType::REPAIR_FAILED_ALERT->value, $title, $message, $ticket->incidentId);

        // Web + SMS Alert to assigned Technician
        if ($ticket->assignedTechnicianId) {
            $tech = $this->userRepo->findById($ticket->assignedTechnicianId);
            if ($tech) {
                $this->notifRepo->createNotification(
                    userId: $tech->userId,
                    notificationType: NotificationType::REPAIR_FAILED_ALERT->value,
                    title: $title,
                    message: $message,
                    incidentId: $ticket->incidentId,
                    channel: 'IN_APP',
                    smsStatus: 'NOT_APPLICABLE'
                );

                if (!empty($tech->phoneNumber)) {
                    $this->dispatchSms($tech->userId, $ticket->incidentId, NotificationType::REPAIR_FAILED_ALERT->value, $tech->phoneNumber, $title, $message);
                }
            }
        }
    }

    /**
     * ADMIN EVENT 6: Rawlsian Water Equity Deficit Warning
     */
    public function notifyEquityDeficit(string $nodeId, float $rdiScore): void
    {
        $title = "EQUITY WARNING: Meter {$nodeId}";
        $message = "Severe distribution equity deficit flagged on meter {$nodeId} (Rawlsian RDI = {$rdiScore}). Household intake is below 70% of community average.";

        $this->notifyAllAdmins(NotificationType::EQUITY_DEFICIT_ALERT->value, $title, $message);
    }

    /**
     * ADMIN EVENT 7: Sensor Offline / Hardware Fault
     */
    public function notifySensorFault(string $nodeId, string $status): void
    {
        $title = "SENSOR FAULT: Meter {$nodeId}";
        $message = "ESP32 monitoring sensor on meter {$nodeId} reported status [{$status}] or stale telemetry (> 45s). Digital twin fallback engaged.";

        $this->notifyAllAdmins(NotificationType::SENSOR_FAULT_ALERT->value, $title, $message);
    }

    // =========================================================================
    // 2. TECHNICIAN NOTIFICATION METHODS
    // =========================================================================

    /**
     * TECHNICIAN EVENT: Work Order Dispatched (Web + SMS)
     */
    public function notifyTechnicianDispatched(IncidentTicket $ticket, int $technicianId): void
    {
        $tech = $this->userRepo->findById($technicianId);
        if (!$tech) return;

        $title = "WORK ORDER DISPATCHED: {$ticket->nodeId}";
        $message = "You have been assigned to repair work order {$ticket->incidentId} on node {$ticket->nodeId}. Please inspect site.";

        $this->notifRepo->createNotification(
            userId: $tech->userId,
            notificationType: NotificationType::WORK_ORDER_DISPATCHED->value,
            title: $title,
            message: $message,
            incidentId: $ticket->incidentId,
            channel: 'IN_APP',
            smsStatus: 'NOT_APPLICABLE'
        );

        if (!empty($tech->phoneNumber)) {
            $this->dispatchSms($tech->userId, $ticket->incidentId, NotificationType::WORK_ORDER_DISPATCHED->value, $tech->phoneNumber, $title, $message);
        }
    }

    // =========================================================================
    // 3. OUTBOUND SMS GATEWAY DISPATCHER
    // =========================================================================
    private function dispatchSms(int $userId, string $incidentId, string $type, string $phoneNumber, string $title, string $message): void
    {
        $smsBody = "{$title}. {$message}";
        $smsResult = SmsGatewayService::sendSms($phoneNumber, $smsBody);

        // Record SMS Notification Row in Table 3.13
        $this->notifRepo->createNotification(
            userId: $userId,
            notificationType: $type,
            title: "[SMS] " . $title,
            message: $message,
            incidentId: $incidentId,
            channel: 'SMS',
            smsStatus: $smsResult['status'] // 'SENT' or 'FAILED'
        );
    }
}