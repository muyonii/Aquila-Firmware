<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\Database;

class AuditLogger
{
    /**
     * Appends an immutable record to the legal audit ledger (INV-06).
     * Protected by database triggers against updates and deletions.
     *
     * @param string      $actionTaken  Canonical action label (e.g., 'INCIDENT_AUTO_CREATED')
     * @param int         $performedBy  User ID of executing actor (defaults to 1 = System Admin)
     * @param string|null $incidentId  UUID of correlated incident ticket (if applicable)
     * @param string|null $remarks     Contextual administrative details
     * @return int The generated log_id
     */
    public static function log(
        string $actionTaken,
        int $performedBy = 1,
        ?string $incidentId = null,
        ?string $remarks = null
    ): int {
        $db = Database::getConnection();

        // Resolve client IP (handles standard REMOTE_ADDR and reverse proxy headers)
        $clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] 
            ?? $_SERVER['REMOTE_ADDR'] 
            ?? '127.0.0.1';

        if (str_contains($clientIp, ',')) {
            $clientIp = trim(explode(',', $clientIp)[0]);
        }

        // Clamp client IP to VARCHAR(45) IPv6 bounds
        $clientIp = substr($clientIp, 0, 45);

        // Clamp action to VARCHAR(50) to prevent strict SQL truncation errors
        $action = substr(trim($actionTaken), 0, 50);

        // Fallback to System Administrator (ID 1) if an invalid or zero user_id is supplied
        $actorId = $performedBy > 0 ? $performedBy : 1;

        $stmt = $db->prepare(
            "INSERT INTO audit_log_entry 
             (incident_id, performed_by, action_taken, client_ip, remarks, logged_at)
             VALUES (:incident_id, :performed_by, :action_taken, :client_ip, :remarks, NOW())"
        );

        $stmt->execute([
            ':incident_id'  => !empty($incidentId) ? $incidentId : null,
            ':performed_by' => $actorId,
            ':action_taken' => $action,
            ':client_ip'    => $clientIp,
            ':remarks'      => $remarks
        ]);

        return (int)$db->lastInsertId();
    }
}