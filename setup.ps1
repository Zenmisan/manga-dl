# Manga-DL Windows Setup Script
# Run this script to set up the project on Windows in one command.

Write-Output "========================================="
Write-Output "Starting Manga-DL Windows Project Setup..."
Write-Output "========================================="

# 1. Install root dependencies
Write-Output "`n[1/4] Installing root packages..."
bun install

# 2. Install frontend dependencies
Write-Output "`n[2/4] Installing frontend packages..."
Set-Location frontend
bun install
Set-Location ..

# 3. Setup backend virtual environment and dependencies
Write-Output "`n[3/4] Setting up backend Python virtual environment..."
Set-Location backend
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
Write-Output "Installing backend requirements..."
.\.venv\Scripts\pip install -r requirements.txt

# 4. Create cross-platform bin redirection junction for Windows
Write-Output "`n[4/4] Creating cross-platform path redirection..."
if (-not (Test-Path "venv")) {
    New-Item -ItemType Directory -Path "venv" -Force | Out-Null
}
if (-not (Test-Path "venv\bin")) {
    # Create directory junction pointing ./venv/bin to .venv/Scripts
    New-Item -ItemType Junction -Path "venv\bin" -Value "$PWD\.venv\Scripts" | Out-Null
    Write-Output "Junction created: backend/venv/bin -> backend/.venv/Scripts"
} else {
    Write-Output "Junction already exists."
}
Set-Location ..

Write-Output "`n========================================="
Write-Output "Setup complete! Run 'bun run dev' to start the servers."
Write-Output "========================================="
