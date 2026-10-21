<?php
declare(strict_types=1);

namespace Aquila\Config;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $connection = null;

    /**
     * Returns a singleton PDO connection instance
     *
     * @throws RuntimeException if connection fails in CLI / Unit Test mode
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            Env::load();
            date_default_timezone_set(AppConfig::TIMEZONE);

            $host = Env::get('DB_HOST', '127.0.0.1');
            $port = Env::getInt('DB_PORT', 3306);
            $db   = Env::get('DB_NAME', 'aquila_db');
            $user = Env::get('DB_USER', 'root');
            $pass = Env::get('DB_PASS', ''); // Correctly supports empty XAMPP root password
            $tz   = Env::get('DB_TIMEZONE', AppConfig::MYSQL_TIMEZONE);

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                // Enforce Philippine Standard Time (UTC+8) on the MySQL connection session
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '{$tz}', NAMES utf8mb4"
            ];

            try {
                self::$connection = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // If running in CLI / PHPUnit / test runner, throw standard exception with stack trace
                if (php_sapi_name() === 'cli') {
                    throw new RuntimeException("Database connection failed: " . $e->getMessage(), (int)$e->getCode(), $e);
                }

                // If running under Apache/Nginx web API, output clean JSON error
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    "success" => false,
                    "error" => [
                        "code"    => "DATABASE_CONNECTION_ERROR",
                        "message" => "Could not connect to the relational database. Please verify MySQL service status."
                    ]
                ], JSON_PRETTY_PRINT);
                exit;
            }
        }

        return self::$connection;
    }

    /**
     * Resets the active connection (vital for worker re-connects and unit test isolation)
     */
    public static function disconnect(): void
    {
        self::$connection = null;
    }
}