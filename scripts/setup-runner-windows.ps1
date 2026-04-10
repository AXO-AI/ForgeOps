# ForgeOps Self-Hosted Runner Setup (Windows)
# Usage: .\setup-runner-windows.ps1 -Url <github_url> -Token <reg_token> [-Labels <labels>] [-Name <name>]
param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$Token,
    [string]$Labels = "forgeops,windows",
    [string]$Name = $env:COMPUTERNAME
)

$ErrorActionPreference = "Stop"
Write-Host "=== ForgeOps Runner Setup (Windows) ==="

# Download runner
$RunnerDir = "C:\actions-runner"
New-Item -ItemType Directory -Force -Path $RunnerDir | Out-Null
Set-Location $RunnerDir

$RunnerVersion = (Invoke-RestMethod -Uri "https://api.github.com/repos/actions/runner/releases/latest").tag_name -replace '^v',''
$RunnerZip = "actions-runner-win-x64-${RunnerVersion}.zip"
$RunnerUrl = "https://github.com/actions/runner/releases/download/v${RunnerVersion}/${RunnerZip}"
Write-Host "Downloading runner v${RunnerVersion}..."
Invoke-WebRequest -Uri $RunnerUrl -OutFile $RunnerZip
Expand-Archive -Path $RunnerZip -DestinationPath . -Force
Remove-Item $RunnerZip

# Configure runner
Write-Host "Configuring runner '$Name'..."
.\config.cmd --url $Url --token $Token --name $Name --labels $Labels --unattended --replace

# Install as Windows service
Write-Host "Installing as Windows service..."
.\svc.cmd install
.\svc.cmd start

Write-Host "=== Runner '$Name' is running with labels: $Labels ==="
