<?php
declare(strict_types=1);

// Prevent PHP warnings/notices from leaking HTML into JSON API responses
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/../vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Controllers\AnalyticsController;
use Aquila\Controllers\AuditController;
use Aquila\Controllers\AuthController;
use Aquila\Controllers\IncidentController;
use Aquila\Controllers\NodeController;
use Aquila\Controllers\NotificationController;
use Aquila\Controllers\ReportController;
use Aquila\Controllers\ResidentController;
use Aquila\Controllers\TaskController;
use Aquila\Controllers\UserController;
use Aquila\Controllers\WebhookController;
use Aquila\Middleware\CorsMiddleware;

// 1. Load Environment Configuration
Env::load();

// 2. Global JSON Exception Handler (Guarantees API never leaks raw HTML error text)
set_exception_handler(function (\Throwable $e): void {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "error" => [
            "code"    => "INTERNAL_SERVER_ERROR",
            "message" => $e->getMessage()
        ]
    ], JSON_PRETTY_PRINT);
    exit;
});

// 3. Handle Cross-Origin Resource Sharing (CORS & Preflight OPTIONS)
CorsMiddleware::handle();

// 4. Normalize Request URI and HTTP Method
$rawPath    = (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$requestUri = rtrim($rawPath, '/'); // Strips trailing slashes safely
$method     = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// =============================================================================
// ROUTE REGISTRY
// =============================================================================

// -----------------------------------------------------------------------------
// 1. HEALTH CHECK & SYSTEM DIAGNOSTICS
// -----------------------------------------------------------------------------
if ($method === 'GET' && ($requestUri === '' || str_ends_with($requestUri, '/public') || str_ends_with($requestUri, '/health'))) {
    header('Content-Type: application/json');
    echo json_encode([
        "system"    => "AQUILA Cold Transactional Governance API",
        "version"   => "v2.3.0",
        "status"    => "OPERATIONAL",
        "timestamp" => time()
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/system/health')) {
    header('Content-Type: application/json');
    
    $dbHealthy = false;
    try {
        $db = Database::getConnection();
        $db->query("SELECT 1");
        $dbHealthy = true;
    } catch (\Throwable $e) {}

    $fbUrl = rtrim(AppConfig::getFirebaseUrl(), '/') . '/blackboard/heartbeats.json';
    $ch = curl_init($fbUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3]);
    $fbRaw = curl_exec($ch);
    $fbCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $fbHeartbeats = ($fbCode >= 200 && $fbCode < 300) ? json_decode((string)$fbRaw, true) : null;

    echo json_encode([
        "success" => true,
        "data" => [
            "system_name"        => "AQUILA Distributed Smart Water System",
            "version"            => "2.3.0",
            "environment"        => Env::get('APP_ENV', 'local'),
            "database_mysql"     => ["status" => $dbHealthy ? "HEALTHY" : "DOWN"],
            "hot_store_firebase" => ["status" => ($fbHeartbeats !== null) ? "HEALTHY" : "DEGRADED"],
            "agent_heartbeats"   => $fbHeartbeats ?? [],
            "server_time"        => date('Y-m-d H:i:s'),
            "timezone"           => date_default_timezone_get()
        ]
    ], JSON_PRETTY_PRINT);
    exit;
}

// -----------------------------------------------------------------------------
// 2. AUTHENTICATION & IDENTITY (Tables 3.1, 3.2, 3.3, 3.4)
// -----------------------------------------------------------------------------
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/register')) {
    (new AuthController())->register();
    exit;
}
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/users/pending-approvals')) {
    (new UserController())->listPendingApprovals();
    exit;
}
if ($method === 'PATCH' && preg_match('#/api/v1/users/(\d+)/approve-meter$#', $requestUri, $matches)) {
    (new UserController())->approveResidentMeter((int)$matches[1]);
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/login')) {
    (new AuthController())->login();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/google')) {
    (new AuthController())->googleLogin();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/refresh')) {
    (new AuthController())->refreshToken();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/logout')) {
    (new AuthController())->logout();
    exit;
}
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/auth/me')) {
    (new AuthController())->getMe();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/change-password')) {
    (new AuthController())->changePassword();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/forgot-password')) {
    (new AuthController())->forgotPassword();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/reset-password')) {
    (new AuthController())->resetPassword();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/verify-otp')) {
    (new AuthController())->verifyOtp();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/auth/request-otp')) {
    (new AuthController())->requestOtp();
    exit;
}

// -----------------------------------------------------------------------------
// 3. USER MANAGEMENT & RBAC (Table 3.1)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/users')) {
    (new UserController())->listUsers();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/users')) {
    (new UserController())->createUser();
    exit;
}
if ($method === 'PUT' && preg_match('#/api/v1/users/(\d+)$#', $requestUri, $matches)) {
    (new UserController())->updateUser((int)$matches[1]);
    exit;
}
if ($method === 'DELETE' && preg_match('#/api/v1/users/(\d+)$#', $requestUri, $matches)) {
    (new UserController())->deleteUser((int)$matches[1]);
    exit;
}

// -----------------------------------------------------------------------------
// 4. INFRASTRUCTURE NODES & HYDRAULIC DAG TOPOLOGY (Tables 3.6 & 3.7)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/nodes')) {
    (new NodeController())->listNodes();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/nodes')) {
    (new NodeController())->createNode();
    exit;
}
if ($method === 'PUT' && preg_match('#/api/v1/nodes/([a-zA-Z0-9\-]+)$#', $requestUri, $matches)) {
    (new NodeController())->updateNode($matches[1]);
    exit;
}
if ($method === 'DELETE' && preg_match('#/api/v1/nodes/([a-zA-Z0-9\-]+)$#', $requestUri, $matches)) {
    (new NodeController())->deleteNode($matches[1]);
    exit;
}

// -----------------------------------------------------------------------------
// 5. INCIDENT TICKETS & DECISION SUPPORT (Tables 3.9, 3.10, 3.11)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/incidents')) {
    (new IncidentController())->listIncidents();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/incidents')) {
    (new IncidentController())->createManualIncident();
    exit;
}
if ($method === 'GET' && preg_match('#/api/v1/incidents/([a-zA-Z0-9\-]+)$#', $requestUri, $matches)) {
    (new IncidentController())->getIncidentDetails($matches[1]);
    exit;
}
if ($method === 'POST' && preg_match('#/api/v1/incidents/([a-zA-Z0-9\-]+)/dispatch$#', $requestUri, $matches)) {
    (new IncidentController())->dispatchTechnician($matches[1]);
    exit;
}
if ($method === 'PATCH' && preg_match('#/api/v1/incidents/([a-zA-Z0-9\-]+)/cancel$#', $requestUri, $matches)) {
    (new IncidentController())->cancelIncident($matches[1]);
    exit;
}
if ($method === 'POST' && preg_match('#/api/v1/incidents/([a-zA-Z0-9\-]+)/verify-flow$#', $requestUri, $matches)) {
    (new IncidentController())->evaluateVerification($matches[1]);
    exit;
}
// ACTION CARD TEMPLATES & SOP DIRECTIVES (Table 3.9)
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/action-cards')) {
    (new \Aquila\Controllers\ActionCardController())->listTemplates();
    exit;
}
if ($method === 'PUT' && preg_match('#/api/v1/action-cards/(\d+)$#', $requestUri, $matches)) {
    (new \Aquila\Controllers\ActionCardController())->updateTemplate((int)$matches[1]);
    exit;
}

// -----------------------------------------------------------------------------
// 6. TECHNICIAN FIELD TASKS (Work Order Dispatch Queue)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/tasks')) {
    (new TaskController())->getMyTasks();
    exit;
}
if ($method === 'GET' && preg_match('#/api/v1/tasks/([a-zA-Z0-9\-]+)$#', $requestUri, $matches)) {
    (new TaskController())->getTaskDetails($matches[1]);
    exit;
}
if ($method === 'POST' && preg_match('#/api/v1/tasks/([a-zA-Z0-9\-]+)/claim$#', $requestUri, $matches)) {
    (new TaskController())->claimOpenTask($matches[1]);
    exit;
}
if ($method === 'PATCH' && preg_match('#/api/v1/tasks/([a-zA-Z0-9\-]+)/arrive$#', $requestUri, $matches)) {
    (new TaskController())->arriveOnSite($matches[1]);
    exit;
}
if ($method === 'PATCH' && preg_match('#/api/v1/tasks/([a-zA-Z0-9\-]+)/repair$#', $requestUri, $matches)) {
    (new TaskController())->submitRepair($matches[1]);
    exit;
}

// -----------------------------------------------------------------------------
// 7. RESIDENT WATER CONSUMPTION & RLS (Table 3.8 & RA 10173)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/resident/my-water')) {
    (new ResidentController())->getMyWater();
    exit;
}
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/resident/concern')) {
    (new ResidentController())->submitConcern();
    exit;
}

// -----------------------------------------------------------------------------
// 8. CLUSTER ANALYTICS & KPIS
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/analytics/summary')) {
    (new AnalyticsController())->getClusterSummary();
    exit;
}

// -----------------------------------------------------------------------------
// 9. SYSTEM NOTIFICATIONS & WEB ALERTS (Table 3.13)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/notifications')) {
    (new NotificationController())->getMyNotifications();
    exit;
}
if ($method === 'PATCH' && preg_match('#/api/v1/notifications/(\d+)/read$#', $requestUri, $matches)) {
    (new NotificationController())->markAsRead((int)$matches[1]);
    exit;
}
if ($method === 'PATCH' && str_ends_with($requestUri, '/api/v1/notifications/read-all')) {
    (new NotificationController())->markAllAsRead();
    exit;
}

// -----------------------------------------------------------------------------
// 10. IMMUTABLE AUDIT TRAIL LEDGER (Table 3.12 & INV-06)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/audit-logs')) {
    (new AuditController())->listAuditLogs();
    exit;
}

// -----------------------------------------------------------------------------
// 11. REGULATORY & OPERATIONAL REPORTS (Table 3.8 & Table 3.11)
// -----------------------------------------------------------------------------
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/reports/consumption')) {
    (new ReportController())->getConsumptionReport();
    exit;
}
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/reports/leaks')) {
    (new ReportController())->getLeakLossReport();
    exit;
}
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/reports/maintenance')) {
    (new ReportController())->getMaintenanceReport();
    exit;
}
if ($method === 'GET' && str_ends_with($requestUri, '/api/v1/reports/export')) {
    (new ReportController())->exportCsv();
    exit;
}

// -----------------------------------------------------------------------------
// 12. ON-DEMAND HOURLY SQL COMPACTION TRIGGER (Live Demo Accelerator)
// -----------------------------------------------------------------------------
if (($method === 'POST' || $method === 'GET') && str_ends_with($requestUri, '/api/v1/reports/compact-now')) {
    header('Content-Type: application/json');
    ob_start();
    require_once __DIR__ . '/../cron/compact_hourly_telemetry.php';
    $output = ob_get_clean();
    echo json_encode([
        "success" => true,
        "message" => "Hourly database compaction executed successfully.",
        "log"     => trim((string)$output)
    ], JSON_PRETTY_PRINT);
    exit;
}

// -----------------------------------------------------------------------------
// 13. AGENT WEBHOOK INGESTION (HMAC-SHA256 Signature Verified)
// -----------------------------------------------------------------------------
if ($method === 'POST' && str_ends_with($requestUri, '/api/v1/webhooks/incident')) {
    (new WebhookController())->handleIncident();
    exit;
}

// -----------------------------------------------------------------------------
// 14. 404 CATCH-ALL FOR UNMATCHED ROUTES
// -----------------------------------------------------------------------------
http_response_code(404);
header('Content-Type: application/json');
echo json_encode([
    "success" => false,
    "error" => [
        "code"    => "ROUTE_NOT_FOUND",
        "message" => "The requested endpoint '{$rawPath}' does not exist on this server."
    ]
], JSON_PRETTY_PRINT);
exit;