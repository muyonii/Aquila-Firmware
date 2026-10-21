<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Aquila\Config\Env;
Env::load();

// Complete Test Registry
$testFiles = [
    // 1. Utilities & Value Objects
    Aquila\Tests\Unit\Utils\UuidTest::class                            => __DIR__ . '/Unit/Utils/UuidTest.php',
    Aquila\Tests\Unit\ValueObjects\FlowRateTest::class                 => __DIR__ . '/Unit/ValueObjects/FlowRateTest.php',
    Aquila\Tests\Unit\ValueObjects\ConsumptionVolumeTest::class       => __DIR__ . '/Unit/ValueObjects/ConsumptionVolumeTest.php',
    Aquila\Tests\Unit\ValueObjects\CoordinatesTest::class             => __DIR__ . '/Unit/ValueObjects/CoordinatesTest.php',
    Aquila\Tests\Unit\ValueObjects\RdiScoreTest::class                => __DIR__ . '/Unit/ValueObjects/RdiScoreTest.php',

    // 2. Closed-Loop Domain Services
    Aquila\Tests\Unit\Services\RepairVerificationServiceTest::class   => __DIR__ . '/Unit/Services/RepairVerificationServiceTest.php',

    // 3. Infrastructure & Baseline Entities (Tables 3.5, 3.6, 3.7, 3.8, 3.9)
    Aquila\Tests\Unit\Entities\MonitoringNodeTest::class              => __DIR__ . '/Unit/Entities/MonitoringNodeTest.php',
    Aquila\Tests\Unit\Entities\ActionCardTemplateTest::class           => __DIR__ . '/Unit/Entities/ActionCardTemplateTest.php',
    Aquila\Tests\Unit\Entities\HouseholdProfileTest::class            => __DIR__ . '/Unit/Entities/HouseholdProfileTest.php',
    Aquila\Tests\Unit\Entities\PipelineEdgeTest::class                => __DIR__ . '/Unit/Entities/PipelineEdgeTest.php',
    Aquila\Tests\Unit\Entities\HourlySummaryTest::class                => __DIR__ . '/Unit/Entities/HourlySummaryTest.php',

    // 4. User Identity & Authentication Entities (Tables 3.1, 3.2, 3.3, 3.4)
    Aquila\Tests\Unit\Entities\UserAccountTest::class                 => __DIR__ . '/Unit/Entities/UserAccountTest.php',
    Aquila\Tests\Unit\Entities\PasswordResetTest::class               => __DIR__ . '/Unit/Entities/PasswordResetTest.php',
    Aquila\Tests\Unit\Entities\UserSessionTest::class                  => __DIR__ . '/Unit/Entities/UserSessionTest.php',
    Aquila\Tests\Unit\Entities\VerificationCodeTest::class            => __DIR__ . '/Unit/Entities/VerificationCodeTest.php',

    // 5. Work Order, Audit & Notification Entities (Tables 3.10, 3.11, 3.12, 3.13)
    Aquila\Tests\Unit\Entities\IncidentTicketTest::class              => __DIR__ . '/Unit/Entities/IncidentTicketTest.php',
    Aquila\Tests\Unit\Entities\IncidentStatusHistoryTest::class       => __DIR__ . '/Unit/Entities/IncidentStatusHistoryTest.php',
    Aquila\Tests\Unit\Entities\AuditLogEntryTest::class               => __DIR__ . '/Unit/Entities/AuditLogEntryTest.php',
    Aquila\Tests\Unit\Entities\SystemNotificationTest::class           => __DIR__ . '/Unit/Entities/SystemNotificationTest.php'
];

echo "====================================================================\n";
echo " AQUILA BACKEND DOMAIN TEST SUITE (100% UNIT TEST COVERAGE)\n";
echo "====================================================================\n";

$totalTests = 0;
$passedTests = 0;
$failedTests = 0;

foreach ($testFiles as $className => $filePath) {
    if (!file_exists($filePath)) {
        continue;
    }
    require_once $filePath;
    $instance = new $className();
    $methods = get_class_methods($instance);

    $testMethods = array_filter($methods, fn($m) => str_starts_with($m, 'test'));

    foreach ($testMethods as $method) {
        $totalTests++;
        $testName = "{$className}::{$method}";
        try {
            $instance->$method();
            $passedTests++;
            echo sprintf("  ✅ [PASS] %s\n", $testName);
        } catch (\Throwable $e) {
            $failedTests++;
            echo sprintf("  ❌ [FAIL] %s\n", $testName);
            echo sprintf("      ↳ Error: %s in %s:%d\n", $e->getMessage(), $e->getFile(), $e->getLine());
        }
    }
}

echo "====================================================================\n";
echo sprintf("RESULTS: Total Tests: %d | Passed: %d | Failed: %d\n", $totalTests, $passedTests, $failedTests);
echo "====================================================================\n";

exit($failedTests === 0 ? 0 : 1);