<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\PipelineEdge;

interface PipelineEdgeRepositoryInterface
{
    /** @return PipelineEdge[] */
    public function findAll(): array;

    /** @return PipelineEdge[] */
    public function findDownstreamOf(string $upstreamNodeId): array;

    /** @return PipelineEdge[] */
    public function findUpstreamOf(string $downstreamNodeId): array;

    public function addEdge(PipelineEdge $edge): void;

    public function removeEdge(string $upstreamNodeId, string $downstreamNodeId): void;
}