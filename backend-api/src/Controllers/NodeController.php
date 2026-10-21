<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Domain\DTOs\CreateNodeDTO;
use Aquila\Domain\Entities\MonitoringNode;
use Aquila\Domain\Entities\PipelineEdge;
use Aquila\Domain\Enums\NodeStatus;
use Aquila\Domain\Enums\UserRole;
use Aquila\Infrastructure\Repositories\MySQLNodeRepository;
use Aquila\Infrastructure\Repositories\MySQLPipelineEdgeRepository;
use Aquila\Middleware\JwtAuthMiddleware;
use Aquila\Middleware\RoleMiddleware;
use Aquila\Services\AuditLogger;
use Aquila\Services\NotificationDispatchService;
use InvalidArgumentException;
use PDO;

class NodeController
{
    private PDO $db;
    private MySQLNodeRepository $nodeRepo;
    private MySQLPipelineEdgeRepository $edgeRepo;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->nodeRepo = new MySQLNodeRepository($this->db);
        $this->edgeRepo = new MySQLPipelineEdgeRepository($this->db);
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    // 1. GET /api/v1/nodes (List all nodes + DAG edges)
    public function listNodes(): void
    {
        $internalKey = $_SERVER['HTTP_X_AQUILA_INTERNAL_KEY'] 
            ?? $_SERVER['REDIRECT_HTTP_X_AQUILA_INTERNAL_KEY'] 
            ?? '';
        $expectedKey = getenv('WEBHOOK_SECRET') ?: 'aquila_internal_hmac_secret_key_2026';

        if ($internalKey !== $expectedKey) {
            JwtAuthMiddleware::authenticate();
        }

        $nodes = $this->nodeRepo->findAll();
        $edges = $this->edgeRepo->findAll();

        $this->json(200, [
            "success" => true,
            "data" => [
                "total_nodes" => count($nodes),
                "nodes"       => array_map(fn($n) => $n->toArray(), $nodes),
                "edges"       => array_map(fn($e) => $e->toArray(), $edges)
            ]
        ]);
    }

    // 2. POST /api/v1/nodes (Provision Node)
    public function createNode(): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $dto = CreateNodeDTO::fromArray($data);
        } catch (InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_INPUT", "message" => $e->getMessage()]]);
        }

        $nodeId = $dto->nodeId ?: $this->nodeRepo->getNextSequentialId();
        if ($this->nodeRepo->exists($nodeId)) {
            $this->json(409, ["success" => false, "error" => ["code" => "NODE_EXISTS", "message" => "Node ID {$nodeId} already exists."]]);
        }

        $deviceToken = bin2hex(random_bytes(16));
        
        $node = new MonitoringNode(
            nodeId: $nodeId,
            householdLabel: $dto->householdLabel,
            locationName: $dto->locationName,
            purokCluster: $dto->purokCluster,
            parentNodeId: $dto->parentNodeId,
            latitude: $dto->latitude,
            longitude: $dto->longitude,
            isPhysical: $dto->isPhysical,
            installationDate: $dto->installationDate,
            status: NodeStatus::ACTIVE,
            deviceToken: $deviceToken
        );

        $this->nodeRepo->save($node);

        if (!empty($dto->parentNodeId)) {
            $this->edgeRepo->addEdge(new PipelineEdge(
                edgeId: null,
                upstreamNodeId: $dto->parentNodeId,
                downstreamNodeId: $nodeId,
                pipeDiameterMm: 25.00,
                pipeMaterial: 'PVC'
            ));
        }

        // Sync status & metadata to Firebase
        $firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
        
        $ch = curl_init("{$firebaseUrl}/nodes/{$nodeId}/status.json");
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => json_encode(NodeStatus::ACTIVE->value),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4
        ]);
        curl_exec($ch);
        curl_close($ch);

        $metaCh = curl_init("{$firebaseUrl}/nodes/{$nodeId}/metadata.json");
        curl_setopt_array($metaCh, [
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => json_encode([
                'household_label' => $dto->householdLabel,
                'location_name'   => $dto->locationName,
                'purok_cluster'   => $dto->purokCluster,
                'is_physical'     => $dto->isPhysical
            ]),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4
        ]);
        curl_exec($metaCh);
        curl_close($metaCh);

        AuditLogger::log('NODE_PROVISIONED', (int)$admin['user_id'], null, "Provisioned {$nodeId} ({$dto->householdLabel}) at {$dto->locationName}");

        $this->json(201, [
            "success" => true,
            "data" => array_merge($node->toArray(), ['device_token' => $deviceToken])
        ]);
    }

    // 3. PUT /api/v1/nodes/{id}
    public function updateNode(string $nodeId): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);

        $target = $this->nodeRepo->findById($nodeId);
        if (!$target) {
            $this->json(404, ["success" => false, "error" => ["code" => "NODE_NOT_FOUND", "message" => "Node {$nodeId} not found."]]);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = isset($data['status']) ? NodeStatus::tryFrom((string)$data['status']) : $target->status;

        if ($status === null) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_STATUS", "message" => "Invalid status value."]]);
        }

        $newParent = isset($data['parent_node_id']) 
            ? ($data['parent_node_id'] ? trim((string)$data['parent_node_id']) : null) 
            : $target->parentNodeId;

        $updated = new MonitoringNode(
            nodeId: $nodeId,
            householdLabel: trim((string)($data['household_label'] ?? $target->householdLabel)),
            locationName: trim((string)($data['location_name'] ?? $target->locationName)),
            purokCluster: trim((string)($data['purok_cluster'] ?? $target->purokCluster)),
            parentNodeId: $newParent,
            latitude: isset($data['latitude']) ? (float)$data['latitude'] : $target->latitude,
            longitude: isset($data['longitude']) ? (float)$data['longitude'] : $target->longitude,
            isPhysical: $target->isPhysical,
            installationDate: $target->installationDate,
            status: $status,
            deviceToken: $target->deviceToken
        );

        $this->nodeRepo->save($updated);

        if ($newParent !== $target->parentNodeId) {
            if ($target->parentNodeId !== null) {
                $this->edgeRepo->removeEdge($target->parentNodeId, $nodeId);
            }
            if ($newParent !== null) {
                $this->edgeRepo->addEdge(new PipelineEdge(null, $newParent, $nodeId));
            }
        }

        // Sync status to Firebase Hot Store
        $firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
        $ch = curl_init("{$firebaseUrl}/nodes/{$nodeId}/status.json");
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => json_encode($status->value),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4
        ]);
        curl_exec($ch);
        curl_close($ch);

        if ($status === NodeStatus::FAULT) {
            $notifService = new NotificationDispatchService($this->db);
            $notifService->notifySensorFault($nodeId, 'FAULT');
        }

        AuditLogger::log('NODE_UPDATED', (int)$admin['user_id'], null, "Updated {$nodeId}. Status: {$status->value}");

        $this->json(200, ["success" => true, "data" => $updated->toArray()]);
    }

    // 4. DELETE /api/v1/nodes/{id} (Decommissioning Guardrail)
    public function deleteNode(string $nodeId): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);

        if (!$this->nodeRepo->exists($nodeId)) {
            $this->json(404, ["success" => false, "error" => ["code" => "NODE_NOT_FOUND", "message" => "Node {$nodeId} not found."]]);
        }

        // Decommissioning Invariant: If tickets exist, soft-decommission to DECOMMISSIONED
        $ticketCount = $this->db->prepare("SELECT COUNT(*) FROM incident_ticket WHERE node_id = :id");
        $ticketCount->execute([':id' => $nodeId]);

        if ((int)$ticketCount->fetchColumn() > 0) {
            $this->db->prepare("UPDATE monitoring_node SET status = 'DECOMMISSIONED' WHERE node_id = :id")
                     ->execute([':id' => $nodeId]);

            // Sync DECOMMISSIONED status to Firebase
            $firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
            $ch = curl_init("{$firebaseUrl}/nodes/{$nodeId}/status.json");
            curl_setopt_array($ch, [
                CURLOPT_CUSTOMREQUEST  => 'PUT',
                CURLOPT_POSTFIELDS     => json_encode('DECOMMISSIONED'),
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 4
            ]);
            curl_exec($ch);
            curl_close($ch);

            AuditLogger::log('NODE_DECOMMISSIONED', (int)$admin['user_id'], null, "Decommissioned node {$nodeId} (Preserved ticket audit history)");
            $this->json(200, ["success" => true, "data" => ["message" => "Node {$nodeId} decommissioned. Historical audit records preserved."]]);
        }

        // If completely clean without tickets, hard delete
        $this->nodeRepo->delete($nodeId);
        AuditLogger::log('NODE_DELETED', (int)$admin['user_id'], null, "Hard-deleted unreferenced node {$nodeId}");

        $this->json(200, ["success" => true, "data" => ["message" => "Node {$nodeId} successfully removed."]]);
    }
}