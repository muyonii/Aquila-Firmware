<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

use Aquila\Domain\Enums\NodeStatus;

readonly class MonitoringNode
{
    public function __construct(
        public string $nodeId,
        public string $householdLabel,
        public string $locationName,
        public string $purokCluster,
        public ?string $parentNodeId,
        public ?float $latitude,
        public ?float $longitude,
        public bool $isPhysical,
        public string $installationDate,
        public NodeStatus $status,
        public ?string $deviceToken = null,
        public ?string $lastHeartbeat = null,
        public ?string $createdAt = null,
        public ?string $updatedAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            nodeId: (string)$row['node_id'],
            householdLabel: (string)$row['household_label'],
            locationName: (string)($row['location_name'] ?? ''),
            purokCluster: (string)($row['purok_cluster'] ?? 'Purok 2'),
            parentNodeId: isset($row['parent_node_id']) ? (string)$row['parent_node_id'] : null,
            latitude: isset($row['latitude']) ? (float)$row['latitude'] : null,
            longitude: isset($row['longitude']) ? (float)$row['longitude'] : null,
            isPhysical: (bool)($row['is_physical'] ?? false),
            installationDate: (string)($row['installation_date'] ?? date('Y-m-d')),
            status: NodeStatus::from((string)$row['status']),
            deviceToken: isset($row['device_token']) ? (string)$row['device_token'] : null,
            lastHeartbeat: isset($row['last_heartbeat']) ? (string)$row['last_heartbeat'] : null,
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null,
            updatedAt: isset($row['updated_at']) ? (string)$row['updated_at'] : null
        );
    }

    public function toArray(): array
    {
        return [
            'node_id'           => $this->nodeId,
            'household_label'   => $this->householdLabel,
            'location_name'     => $this->locationName,
            'purok_cluster'     => $this->purokCluster,
            'parent_node_id'    => $this->parentNodeId,
            'coordinates'       => [
                'lat' => $this->latitude,
                'lng' => $this->longitude
            ],
            'is_physical'       => $this->isPhysical,
            'installation_date' => $this->installationDate,
            'status'            => $this->status->value,
            'last_heartbeat'    => $this->lastHeartbeat,
            'created_at'        => $this->createdAt,
            'updated_at'        => $this->updatedAt
        ];
    }
}