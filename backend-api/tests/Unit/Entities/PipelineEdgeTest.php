<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\PipelineEdge;

class PipelineEdgeTest
{
    public function testConduitHydration(): void
    {
        $edge = new PipelineEdge(
            edgeId: 1,
            upstreamNodeId: 'NODE-B1-001',
            downstreamNodeId: 'NODE-B1-002',
            pipeDiameterMm: 32.00,
            pipeMaterial: 'PVC',
            lengthMeters: 45.50
        );

        assert($edge->upstreamNodeId === 'NODE-B1-001');
        assert($edge->downstreamNodeId === 'NODE-B1-002');
        assert($edge->pipeDiameterMm === 32.00);
        assert($edge->lengthMeters === 45.50);
    }
}