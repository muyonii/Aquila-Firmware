<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\MonitoringNode;
use Aquila\Domain\Enums\NodeStatus;

class MonitoringNodeTest
{
    public function testInstantiationWithSpatialCoordinates(): void
    {
        $node = new MonitoringNode(
            nodeId: 'NODE-B1-001',
            householdLabel: 'Household 01 (Physical Rig)',
            locationName: 'Bougainvillea St., Purok 2',
            purokCluster: 'Purok 2',
            parentNodeId: null,
            latitude: 14.6778000,
            longitude: 120.5412000,
            isPhysical: true,
            installationDate: '2026-09-01',
            status: NodeStatus::ACTIVE,
            deviceToken: 'token_001_secure'
        );

        assert($node->nodeId === 'NODE-B1-001');
        assert($node->isPhysical === true);
        assert($node->status === NodeStatus::ACTIVE);
        assert($node->latitude === 14.6778000);
        assert($node->longitude === 120.5412000);
    }

    public function testFromArrayHydration(): void
    {
        $row = [
            'node_id'           => 'NODE-B1-002',
            'household_label'   => 'Household 02',
            'location_name'     => 'Rosal Ext.',
            'purok_cluster'     => 'Purok 2',
            'parent_node_id'    => 'NODE-B1-001',
            'latitude'          => '14.6772000',
            'longitude'         => '120.5422000',
            'is_physical'       => 0,
            'installation_date' => '2026-09-01',
            'status'            => 'MAINTENANCE',
            'device_token'      => null
        ];

        $node = MonitoringNode::fromArray($row);
        assert($node->nodeId === 'NODE-B1-002');
        assert($node->parentNodeId === 'NODE-B1-001');
        assert($node->status === NodeStatus::MAINTENANCE);
        assert($node->isPhysical === false);
    }
}