param(
    [string]$PollDir     = ".\sw-poll",
    [string]$APIDir      = ".\sw-api",
    [string]$AlertDir      = ".\sw-alert",
    [string]$PollImage   = "sw-poll:latest",
    [string]$APIImage    = "sw-api:latest",
    [string]$AlertImage    = "sw-alert:latest",
    [string]$namespace   = "solar-wind",
    [string]$manifest    = "k8s.yaml"
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

# 3) (Optional) Push images to your registry here
#    e.g. docker push $PollImage; docker push $APIImage

# 4) Delete existing namespace (so everything comes up clean)
# Write-Host "`nDeleting namespace '$namespace' (if it exists)..."
# kubectl delete namespace $namespace --ignore-not-found
# if ($LASTEXITCODE -ne 0) { Write-Warning "Could not delete namespace; continuing anyway." }

# # 5) Re-create namespace and apply manifests
# Write-Host "`nCreating namespace '$namespace' and deploying..."
# kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -
# kubectl apply -f $manifest -n $namespace
# if ($LASTEXITCODE -ne 0) { Write-Error "kubectl apply failed"; exit $LASTEXITCODE }
#helm uninstall -n solar-wind rtsw
#helm install rtsw ./helm  --namespace solar-wind  --create-namespace  
helm upgrade --install rtsw ./helm  --namespace solar-wind  --create-namespace       

Write-Host "`n Redeploy complete."
