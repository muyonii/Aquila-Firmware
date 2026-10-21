<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use InvalidArgumentException;

readonly class CreateNodeDTO
{
    public function __construct(
        public ?string $nodeId,
        public string $householdLabel,
        public string $locationName,
        public string $purokCluster,
        public ?string $parentNodeId,
        public ?float $latitude,
        public ?float $longitude,
        public bool $isPhysical,
        public string $installationDate,
        public string $status = 'ACTIVE'
    ) {}

    public static function fromArray(array $data): self
    {
        $nodeId = !empty($data['node_id']) ? strtoupper(trim((string)$data['node_id'])) : null;
        if ($nodeId !== null && (strlen($nodeId) < 3 || strlen($nodeId) > 20)) {
            throw new InvalidArgumentException("node_id must be between 3 and 20 characters.");
        }

        $label = trim((string)($data['household_label'] ?? ''));
        if (empty($label)) {
            throw new InvalidArgumentException("household_label is required.");
        }
        if (strlen($label) > 100) {
            throw new InvalidArgumentException("household_label cannot exceed 100 characters.");
        }

        $location = trim((string)($data['location_name'] ?? ''));
        if (empty($location)) {
            throw new InvalidArgumentException("location_name is required.");
        }
        if (strlen($location) > 255) {
            throw new InvalidArgumentException("location_name cannot exceed 255 characters.");
        }

        $purok = trim((string)($data['purok_cluster'] ?? 'Purok 2'));
        if (strlen($purok) > 50) {
            throw new InvalidArgumentException("purok_cluster cannot exceed 50 characters.");
        }

        $parent = !empty($data['parent_node_id']) ? strtoupper(trim((string)$data['parent_node_id'])) : null;
        if ($parent !== null && $parent === $nodeId) {
            throw new InvalidArgumentException("A node cannot be its own parent.");
        }

        $lat = isset($data['latitude']) && $data['latitude'] !== '' ? (float)$data['latitude'] : null;
        $lng = isset($data['longitude']) && $data['longitude'] !== '' ? (float)$data['longitude'] : null;

        if ($lat !== null && ($lat < -90.0 || $lat > 90.0)) {
            throw new InvalidArgumentException("Latitude must be between -90.0 and +90.0 degrees.");
        }
        if ($lng !== null && ($lng < -180.0 || $lng > 180.0)) {
            throw new InvalidArgumentException("Longitude must be between -180.0 and +180.0 degrees.");
        }

        $status = strtoupper(trim((string)($data['status'] ?? 'ACTIVE')));
        $validStatuses = ['ACTIVE', 'FAULT', 'DECOMMISSIONED', 'MAINTENANCE'];
        if (!in_array($status, $validStatuses, true)) {
            throw new InvalidArgumentException("Invalid node status. Allowed: " . implode(', ', $validStatuses));
        }

        $installDate = !empty($data['installation_date']) ? trim((string)$data['installation_date']) : date('Y-m-d');

        return new self(
            nodeId: $nodeId,
            householdLabel: $label,
            locationName: $location,
            purokCluster: $purok,
            parentNodeId: $parent,
            latitude: $lat,
            longitude: $lng,
            isPhysical: (bool)($data['is_physical'] ?? false),
            installationDate: $installDate,
            status: $status
        );
    }
}