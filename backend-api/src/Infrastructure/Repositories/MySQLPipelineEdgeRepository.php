<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\PipelineEdge;
use Aquila\Domain\Repositories\PipelineEdgeRepositoryInterface;
use PDO;

class MySQLPipelineEdgeRepository implements PipelineEdgeRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    /**
     * @return PipelineEdge[]
     */
    public function findAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM pipeline_dag_edge ORDER BY upstream_node_id ASC, downstream_node_id ASC");
        return array_map(fn($row) => PipelineEdge::fromArray($row), $stmt->fetchAll());
    }

    /**
     * Finds immediate downstream children connected to an upstream feeder
     * @return PipelineEdge[]
     */
    public function findDownstreamOf(string $upstreamNodeId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM pipeline_dag_edge WHERE upstream_node_id = :id");
        $stmt->execute([':id' => $upstreamNodeId]);
        return array_map(fn($row) => PipelineEdge::fromArray($row), $stmt->fetchAll());
    }

    /**
     * Finds upstream feeder feeding a specific downstream meter
     * @return PipelineEdge[]
     */
    public function findUpstreamOf(string $downstreamNodeId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM pipeline_dag_edge WHERE downstream_node_id = :id");
        $stmt->execute([':id' => $downstreamNodeId]);
        return array_map(fn($row) => PipelineEdge::fromArray($row), $stmt->fetchAll());
    }

    public function addEdge(PipelineEdge $edge): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO pipeline_dag_edge 
             (upstream_node_id, downstream_node_id, pipe_diameter_mm, pipe_material, length_meters)
             VALUES (:upstream, :downstream, :diameter, :material, :length)
             ON DUPLICATE KEY UPDATE
                 pipe_diameter_mm = VALUES(pipe_diameter_mm),
                 pipe_material    = VALUES(pipe_material),
                 length_meters    = VALUES(length_meters)"
        );
        $stmt->execute([
            ':upstream'   => $edge->upstreamNodeId,
            ':downstream' => $edge->downstreamNodeId,
            ':diameter'   => $edge->pipeDiameterMm,
            ':material'   => $edge->pipeMaterial,
            ':length'     => $edge->lengthMeters
        ]);
    }

    public function removeEdge(string $upstreamNodeId, string $downstreamNodeId): void
    {
        $stmt = $this->db->prepare(
            "DELETE FROM pipeline_dag_edge 
             WHERE upstream_node_id = :up AND downstream_node_id = :down"
        );
        $stmt->execute([':up' => $upstreamNodeId, ':down' => $downstreamNodeId]);
    }
}