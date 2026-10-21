<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\ActionCardTemplate;

class ActionCardTemplateTest
{
    public function testInstantiationAndHydration(): void
    {
        $template = new ActionCardTemplate(
            templateId: 1,
            incidentType: 'CRITICAL_LEAK',
            severityLevel: 'P1',
            academicClassification: 'HIGH_VELOCITY_BURST',
            academicTerm: 'High-Velocity Laminar Pipe Burst',
            displayName: 'Sudden Pipe Rupture',
            actionCardTitle: 'Catastrophic Rupture',
            actionDirective: 'Close gate valve and patch conduit.'
        );

        assert($template->templateId === 1);
        assert($template->incidentType === 'CRITICAL_LEAK');
        assert($template->severityLevel === 'P1');
        assert($template->academicClassification === 'HIGH_VELOCITY_BURST');
    }

    public function testFromArrayFactoryHydration(): void
    {
        $row = [
            'template_id'             => '2',
            'incident_type'           => 'CRITICAL_LEAK',
            'severity_level'          => 'P2',
            'academic_classification' => 'ZERO_FLOW_INVARIANT',
            'academic_term'           => 'Zero-Flow Invariant Violation',
            'display_name'            => 'Continuous Fixture Leak',
            'action_card_title'       => 'Running Toilet',
            'action_directive'        => 'Inspect flapper valve.'
        ];

        $entity = ActionCardTemplate::fromArray($row);
        assert($entity->templateId === 2);
        assert($entity->severityLevel === 'P2');
        assert($entity->actionCardTitle === 'Running Toilet');
    }
}