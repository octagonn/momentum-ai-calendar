# Repair all Supabase migrations
$migrations = @(
    "20250923093043",
    "20250925021004", 
    "20250925021007",
    "20250925021013",
    "20250925023012",
    "20250925023024",
    "20250926082826",
    "20250927083555"
)

foreach ($migration in $migrations) {
    Write-Host "Repairing migration: $migration"
    npx supabase migration repair --status reverted $migration
}
