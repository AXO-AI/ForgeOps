# setup-runner-windows.ps1 - Install and configure a GitHub Actions self-hosted runner on Windows
#
# Usage:
#   .\setup-runner-windows.ps1 -Url <repo_url> -Token <reg_token> -Name <runner_name> -Labels <labels>

param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [Parameter(Mandatory = $false)]
    [string]$Name = "$env:COMPUTERNAME-runner",

    [Parameter(Mandatory = $false)]
    [string]$Labels = "self-hosted,windows"
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
$RunnerVersion = if ($env:RUNNER_VERSION) { $env:RUNNER_VERSION } else { "2.321.0" }
$RunnerDir = if ($env:RUNNER_DIR) { $env:RUNNER_DIR } else { "C:\actions-runner" }

Write-Host "============================================"
Write-Host "  ForgeOps Windows Runner Setup"
Write-Host "  URL:    $Url"
Write-Host "  Name:   $Name"
Write-Host "  Labels: $Labels"
Write-Host "============================================"

# ------------------------------------------------------------------
# Helper: download a file
# ------------------------------------------------------------------
function Get-FileFromUrl {
    param(
        [string]$DownloadUrl,
        [string]$OutputPath
    )
    Write-Host "[INFO] Downloading $DownloadUrl"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($DownloadUrl, $OutputPath)
    $webClient.Dispose()
}

# ------------------------------------------------------------------
# Install GitHub Actions Runner
# ------------------------------------------------------------------
function Install-Runner {
    Write-Host "[INFO] Installing GitHub Actions Runner v$RunnerVersion..."

    if (-not (Test-Path $RunnerDir)) {
        New-Item -ItemType Directory -Path $RunnerDir -Force | Out-Null
    }

    $runnerZip = "actions-runner-win-x64-$RunnerVersion.zip"
    $runnerUrl = "https://github.com/actions/runner/releases/download/v$RunnerVersion/$runnerZip"
    $zipPath = Join-Path $RunnerDir $runnerZip

    if (-not (Test-Path $zipPath)) {
        Get-FileFromUrl -DownloadUrl $runnerUrl -OutputPath $zipPath
    }

    Write-Host "[INFO] Extracting runner..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $RunnerDir)

    Write-Host "[INFO] Configuring runner..."
    $configCmd = Join-Path $RunnerDir "config.cmd"
    & $configCmd `
        --url $Url `
        --token $Token `
        --name $Name `
        --labels $Labels `
        --unattended `
        --replace

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Runner configuration failed with exit code $LASTEXITCODE"
        exit 1
    }

    Write-Host "[PASS] GitHub Actions Runner installed and configured"
}

# ------------------------------------------------------------------
# Install runner as a Windows service
# ------------------------------------------------------------------
function Install-RunnerService {
    Write-Host "[INFO] Installing runner as Windows service..."

    $svcCmd = Join-Path $RunnerDir "svc.cmd"

    if (-not (Test-Path $svcCmd)) {
        Write-Host "[INFO] Service script not found -- skipping service installation"
        return
    }

    & $svcCmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Service installation failed with exit code $LASTEXITCODE"
        exit 1
    }

    & $svcCmd start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Service start failed with exit code $LASTEXITCODE"
        exit 1
    }

    Write-Host "[PASS] Runner service installed and started"
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
try {
    Install-Runner
    Install-RunnerService

    Write-Host ""
    Write-Host "[PASS] Windows runner setup complete"
    Write-Host "[INFO] Runner directory: $RunnerDir"
    Write-Host "[INFO] Service name: actions.runner.*"
}
catch {
    Write-Host "[FAIL] Setup failed: $_"
    exit 1
}
