<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Domain\Enums\UserRole;
use Aquila\Infrastructure\Repositories\MySQLActionCardTemplateRepository;
use Aquila\Middleware\JwtAuthMiddleware;
use Aquila\Middleware\RoleMiddleware;
use Aquila\Services\AuditLogger;
use PDO;

class ActionCardController
{
    private PDO $db;
    private MySQLActionCardTemplateRepository $templateRepo;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->templateRepo = new MySQLActionCardTemplateRepository($this->db);
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    // 1. GET /api/v1/action-cards (List all templates)
    public function listTemplates(): void
    {
        JwtAuthMiddleware::authenticate();
        $templates = $this->templateRepo->findAll();

        $this->json(200, [
            "success" => true,
            "data"    => array_map(fn($t) => $t->toArray(), $templates)
        ]);
    }

    // 2. PUT /api/v1/action-cards/{id} (Customize SOP Repair Directive)
    public function updateTemplate(int $templateId): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);

        $template = $this->templateRepo->findById($templateId);
        if (!$template) {
            $this->json(404, ["success" => false, "error" => ["code" => "TEMPLATE_NOT_FOUND", "message" => "Action template not found."]]);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $title = trim((string)($data['action_card_title'] ?? $template->actionCardTitle));
        $directive = trim((string)($data['action_directive'] ?? $template->actionDirective));
        $displayName = trim((string)($data['display_name'] ?? $template->displayName));

        $stmt = $this->db->prepare(
            "UPDATE action_card_templates 
             SET display_name = :display_name,
                 action_card_title = :title,
                 action_directive = :directive
             WHERE template_id = :id"
        );
        $stmt->execute([
            ':display_name' => $displayName,
            ':title'        => $title,
            ':directive'    => $directive,
            ':id'           => $templateId
        ]);

        AuditLogger::log('TEMPLATE_UPDATED', (int)$admin['user_id'], null, "Updated SOP directive for template ID {$templateId} ({$displayName})");

        $updated = $this->templateRepo->findById($templateId);
        $this->json(200, ["success" => true, "data" => $updated->toArray()]);
    }
}