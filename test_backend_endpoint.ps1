# Test if the 6Degrees backend is accessible

Write-Host "=== Testing 6Degrees Backend ===" -ForegroundColor Cyan

# Test 1: Check if backend is reachable
Write-Host "`n1. Testing backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://6degreesbackend-production.up.railway.app/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Backend is healthy! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend health check failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Check the webhook endpoint
Write-Host "`n2. Testing unread-messages-digest webhook endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        user_id = "test-id"
        email = "augustduamath@gmail.com"
        first_name = "Test"
        last_name = "User"
        unread_count = 5
    } | ConvertTo-Json

    $response = Invoke-WebRequest `
        -Uri "https://6degreesbackend-production.up.railway.app/api/notifications/webhooks/unread-messages-digest" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Webhook endpoint responded! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Webhook endpoint failed!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan

