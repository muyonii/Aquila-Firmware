@echo off
:: ============================================================================
:: AQUILA Automated Database Hot Backup 
:: ============================================================================
set DB_NAME=aquila_db
set DB_USER=root
set DB_PASS=
set BACKUP_DIR=C:\xampp\htdocs\aquila-system\backend-api\database\backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generate ISO 8601 Timestamp: YYYYMMDD_HHMMSS
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_backup_%TIMESTAMP%.sql

echo [%date% %time%] Initiating transactional backup for %DB_NAME%...

:: --single-transaction guarantees ACID consistency without locking tables
C:\xampp\mysql\bin\mysqldump.exe --user=%DB_USER% --single-transaction --quick --routines --triggers %DB_NAME% > "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo [%date% %time%] [SUCCESS] Backup completed: %BACKUP_FILE%
) else (
    echo [%date% %time%] [ERROR] Backup failed with exit code %ERRORLEVEL%
)

:: Retain only backups created within the last 7 days (auto-prune old dumps)
forfiles /p "%BACKUP_DIR%" /m *.sql /d -7 /c "cmd /c del @path" 2>nul