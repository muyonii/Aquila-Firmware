<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\HouseholdProfile;
use Aquila\Domain\Repositories\HouseholdProfileRepositoryInterface;
use PDO;

class MySQLHouseholdProfileRepository implements HouseholdProfileRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findByNodeId(string $nodeId): ?HouseholdProfile
    {
        $stmt = $this->db->prepare("SELECT * FROM household_profile WHERE node_id = :node_id LIMIT 1");
        $stmt->execute([':node_id' => $nodeId]);
        $row = $stmt->fetch();

        return $row ? HouseholdProfile::fromArray($row) : null;
    }

    public function findAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM household_profile ORDER BY node_id ASC");
        return array_map(fn($row) => HouseholdProfile::fromArray($row), $stmt->fetchAll());
    }

    public function save(HouseholdProfile $profile): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO household_profile 
             (node_id, expected_night_flow_lpm, typical_max_duration_mins, mean_daily_volume_liters, last_profiled_at)
             VALUES (:node_id, :night_flow, :max_dur, :daily_vol, NOW())
             ON DUPLICATE KEY UPDATE
                 expected_night_flow_lpm   = VALUES(expected_night_flow_lpm),
                 typical_max_duration_mins = VALUES(typical_max_duration_mins),
                 mean_daily_volume_liters  = VALUES(mean_daily_volume_liters),
                 last_profiled_at          = NOW()"
        );
        $stmt->execute([
            ':node_id'    => $profile->nodeId,
            ':night_flow' => $profile->expectedNightFlowLpm,
            ':max_dur'    => $profile->typicalMaxDurationMins,
            ':daily_vol'  => $profile->meanDailyVolumeLiters
        ]);
    }

    public function deleteByNodeId(string $nodeId): void
    {
        $stmt = $this->db->prepare("DELETE FROM household_profile WHERE node_id = :node_id");
        $stmt->execute([':node_id' => $nodeId]);
    }
}