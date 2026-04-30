# ==============================================================================
# performance-tests/run-all-tests.ps1
#
# Finance Pulse — One-Click Performance Test Runner
# Runs all load tests and produces a unified summary.
#
# Prerequisites:
#   1. Install k6:  winget install k6 --source winget
#   2. Install deps: npm install   (in this folder)
#   3. Create test-users.json and run: node get-tokens.js
#   4. Set env vars from get-tokens.js output (see below)
#
# Usage:
#   cd d:\Projects\Zorvyn_assignment\performance-tests
#   .\run-all-tests.ps1
#
# Or with explicit tokens:
#   .\run-all-tests.ps1 `
#     -ViewerToken  "eyJ..." `
#     -AnalystToken "eyJ..." `
#     -AdminToken   "eyJ..." `
#     -IncomeCatId  "uuid..." `
#     -ExpenseCatId "uuid..."
# ==============================================================================

param(
    [string]$ViewerToken   = $env:VIEWER_TOKEN,
    [string]$AnalystToken  = $env:ANALYST_TOKEN,
    [string]$AdminToken    = $env:ADMIN_TOKEN,
    [string]$IncomeCatId   = $env:INCOME_CATEGORY_ID,
    [string]$ExpenseCatId  = $env:EXPENSE_CATEGORY_ID,
    [switch]$SkipSeeding   = $false,
    [switch]$ColdStartOnly = $false
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Colours
function Write-Step  { param($msg) Write-Host "`n🔷 $msg" -ForegroundColor Cyan  }
function Write-Ok    { param($msg) Write-Host "   ✅ $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "   ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "   ❌ $msg" -ForegroundColor Red   }

# ─── Validate prerequisites ───────────────────────────────────────────────────
Write-Step "Checking prerequisites..."

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Fail "k6 not found. Install with: winget install k6 --source winget"
    Write-Host "   Then close and reopen PowerShell." -ForegroundColor Yellow
    exit 1
}
Write-Ok "k6 found: $(k6 version 2>&1 | Select-Object -First 1)"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js not found. Install from https://nodejs.org"
    exit 1
}
Write-Ok "Node.js found: $(node --version)"

# ─── Validate tokens ─────────────────────────────────────────────────────────
Write-Step "Validating tokens..."

$missingTokens = @()
if (-not $ViewerToken  -or $ViewerToken.StartsWith("PASTE"))  { $missingTokens += "VIEWER_TOKEN"  }
if (-not $AnalystToken -or $AnalystToken.StartsWith("PASTE")) { $missingTokens += "ANALYST_TOKEN" }
if (-not $AdminToken   -or $AdminToken.StartsWith("PASTE"))   { $missingTokens += "ADMIN_TOKEN"   }

if ($missingTokens.Count -gt 0) {
    Write-Fail "Missing tokens: $($missingTokens -join ', ')"
    Write-Host @"

   Run this to get tokens:
     node get-tokens.js

   Then set env vars:
     `$env:VIEWER_TOKEN   = "eyJ..."
     `$env:ANALYST_TOKEN  = "eyJ..."
     `$env:ADMIN_TOKEN    = "eyJ..."
     `$env:INCOME_CATEGORY_ID  = "uuid..."
     `$env:EXPENSE_CATEGORY_ID = "uuid..."
"@ -ForegroundColor Yellow
    exit 1
}
Write-Ok "All tokens present"

# Common k6 env flags
$K6Env = @(
    "--env", "VIEWER_TOKEN=$ViewerToken",
    "--env", "ANALYST_TOKEN=$AnalystToken",
    "--env", "ADMIN_TOKEN=$AdminToken"
)
if ($IncomeCatId)  { $K6Env += "--env", "INCOME_CATEGORY_ID=$IncomeCatId"  }
if ($ExpenseCatId) { $K6Env += "--env", "EXPENSE_CATEGORY_ID=$ExpenseCatId" }

# Ensure results dir exists
New-Item -ItemType Directory -Path "results" -Force | Out-Null

# ─── TEST 1: Cold Start Test ──────────────────────────────────────────────────
Write-Step "Running Cold Start Test (20 min)..."
Write-Host "   Tests cold vs warm latency for Edge Functions." -ForegroundColor Gray

$coldCmd = @("run") + $K6Env + @(
    "--out", "json=results/cold-start.json",
    "k6/cold-start-test.js"
)

try {
    & k6 @coldCmd
    Write-Ok "Cold start test complete → results/cold-start.json"
} catch {
    Write-Warn "Cold start test encountered errors (check output above)"
}

if ($ColdStartOnly) {
    Write-Host "`n✅  Cold start test done. Exiting (--ColdStartOnly flag set)." -ForegroundColor Green
    exit 0
}

# ─── TEST 2: Main Load Test (50–200 VUs) ─────────────────────────────────────
Write-Step "Running Main Load Test (50→200 VUs, ~10 min)..."
Write-Host "   This is the primary test for your resume metrics." -ForegroundColor Gray

$mainCmd = @("run") + $K6Env + @(
    "--out", "json=results/main-load-test.json",
    "k6/main-load-test.js"
)

try {
    & k6 @mainCmd
    Write-Ok "Main load test complete → results/main-load-test.json"
} catch {
    Write-Warn "Main load test encountered errors"
}

# ─── TEST 3: Data Scaling Tests ───────────────────────────────────────────────
if (-not $SkipSeeding) {
    Write-Step "Running Data Scaling Tests..."

    # Check service role key
    if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
        Write-Warn "SUPABASE_SERVICE_ROLE_KEY not set. Skipping seeding."
        Write-Host "   Set it and re-run with: node seed-transactions.js --count 10000" -ForegroundColor Yellow
    } else {
        # Small: 10k rows
        Write-Host "   Seeding 10,000 rows..." -ForegroundColor Gray
        node seed-transactions.js --count 10000
        & k6 @(("run") + $K6Env + @("--env", "DATA_SIZE=small", "--out", "json=results/scaling-small.json", "k6/scaling-test.js"))

        # Medium: 30k rows (10k already in, add 20k more)
        Write-Host "   Seeding 20,000 more rows (total ~30k)..." -ForegroundColor Gray
        node seed-transactions.js --count 20000
        & k6 @(("run") + $K6Env + @("--env", "DATA_SIZE=medium", "--out", "json=results/scaling-medium.json", "k6/scaling-test.js"))

        # Large: 50k rows (30k in, add 20k more)
        Write-Host "   Seeding 20,000 more rows (total ~50k)..." -ForegroundColor Gray
        node seed-transactions.js --count 20000
        & k6 @(("run") + $K6Env + @("--env", "DATA_SIZE=large", "--out", "json=results/scaling-large.json", "k6/scaling-test.js"))

        # Cleanup
        Write-Host "   Cleaning up seeded test data..." -ForegroundColor Gray
        node seed-transactions.js --clear
        Write-Ok "Scaling tests complete"
    }
}

# ─── Summary ─────────────────────────────────────────────────────────────────
$Duration = (Get-Date) - $StartTime
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Finance Pulse Performance Test Suite Complete" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Total time: $($Duration.ToString('mm\:ss'))"
Write-Host "  Results in: .\results\"
Write-Host ""
Write-Host "  Files generated:" -ForegroundColor White
Get-ChildItem results -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "    → $($_.Name)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Next: Run `node interpret-results.js` to generate" -ForegroundColor Yellow
Write-Host "        resume-ready bullet points." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
