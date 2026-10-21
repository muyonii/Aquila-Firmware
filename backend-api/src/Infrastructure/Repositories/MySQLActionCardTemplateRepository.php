<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\ActionCardTemplate;
use Aquila\Domain\Repositories\ActionCardTemplateRepositoryInterface;
use PDO;

class MySQLActionCardTemplateRepository implements ActionCardTemplateRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findById(int $templateId): ?ActionCardTemplate
    {
        $stmt = $this->db->prepare("SELECT * FROM action_card_templates WHERE template_id = :id LIMIT 1");
        $stmt->execute([':id' => $templateId]);
        $row = $stmt->fetch();

        return $row ? ActionCardTemplate::fromArray($row) : null;
    }

    public function findByClassification(string $academicClassification): ?ActionCardTemplate
    {
        $stmt = $this->db->prepare("SELECT * FROM action_card_templates WHERE academic_classification = :code LIMIT 1");
        $stmt->execute([':code' => $academicClassification]);
        $row = $stmt->fetch();

        return $row ? ActionCardTemplate::fromArray($row) : null;
    }

    public function findByTypeAndSeverity(string $incidentType, string $severityLevel): ?ActionCardTemplate
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM action_card_templates 
             WHERE incident_type = :type AND severity_level = :severity 
             ORDER BY template_id ASC LIMIT 1"
        );
        $stmt->execute([':type' => $incidentType, ':severity' => $severityLevel]);
        $row = $stmt->fetch();

        return $row ? ActionCardTemplate::fromArray($row) : null;
    }

    public function findAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM action_card_templates ORDER BY template_id ASC");
        return array_map(fn($r) => ActionCardTemplate::fromArray($r), $stmt->fetchAll());
    }
}