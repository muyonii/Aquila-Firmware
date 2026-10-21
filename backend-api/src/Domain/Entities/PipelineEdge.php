<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class PipelineEdge
{
    public function __construct(
        public ?int $edgeId,
        public string $upstreamNodeId,
        public string $downstreamNodeId,
        public float $pipeDiameterMm = 25.00,
        public string $pipeMaterial = 'PVC',
        public ?float $lengthMeters = null,
        public ?string $createdAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            edgeId: isset($row['edge_id']) ? (int)$row['edge_id'] : null,
            upstreamNodeId: (string)$row['upstream_node_id'],
            downstreamNodeId: (string)$row['downstream_node_id'],
            pipeDiameterMm: isset($row['pipe_diameter_mm']) ? (float)$row['pipe_diameter_mm'] : 25.00,
            pipeMaterial: (string)($row['pipe_material'] ?? 'PVC'),
            lengthMeters: isset($row['length_meters']) ? (float)$row['length_meters'] : null,
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null
        );
    }

    public function toArray(): array
    {
        return [
            'edge_id'            => $this->edgeId,
            'upstream_node_id'   => $this->upstreamNodeId,
            'downstream_node_id' => $this->downstreamNodeId,
            'pipe_diameter_mm'   => $this->pipeDiameterMm,
            'pipe_material'      => $this->pipeMaterial,
            'length_meters'      => $this->lengthMeters,
            'created_at'         => $this->createdAt
        ];
    }
}