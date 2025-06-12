param(
    [string]$PollDir     = ".\sw-poll",
    [string]$APIDir      = ".\sw-api",
    [string]$AlertDir      = ".\sw-alert",
    [string]$DashDir     = ".\sw-dashboard",
    [string]$PollImage   = "sw-poll:latest",
    [string]$APIImage    = "sw-api:latest",
    [string]$AlertImage    = "sw-alert:latest",
    [string]$DashImage   = "sw-dashboard:latest"
    
    )

# 1) Build poller image
Write-Host "Building Docker image '$PollImage' from '$PollDir'..."
docker build -t $PollImage $PollDir 
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to build $PollImage"; exit $LASTEXITCODE }

# 2) Build API image
Write-Host "Building Docker image '$APIImage' from '$APIDir'..."
docker build -t $APIImage $APIDir 
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to build $APIImage"; exit $LASTEXITCODE }

Write-Host "Building Docker image '$AlertImage' from '$AlertDir'..."
docker build -t $AlertImage $AlertDir 
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to build $AlertImage"; exit $LASTEXITCODE }

Write-Host "Building Docker image '$DashImage' from '$DashDir'..."
docker build -t $DashImage $DashDir 
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to build $DashImage"; exit $LASTEXITCODE }