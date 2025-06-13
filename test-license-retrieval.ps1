# Test License Retrieval Script

$email = Read-Host "Enter the email you used for payment"

Write-Host "`n🔍 Testing license retrieval for: $email" -ForegroundColor Cyan

# Test production server
Write-Host "`n📡 Checking production server..." -ForegroundColor Yellow

$body = @{
    email = $email
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://license.spventerprises.com/retrieve-license" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ License found!" -ForegroundColor Green
    Write-Host "License Key: $($response.licenseKey)" -ForegroundColor Green
    Write-Host "Created: $($response.created)" -ForegroundColor Gray
    Write-Host "Active: $($response.active)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ No license found for this email" -ForegroundColor Red
        Write-Host "`n💡 Possible reasons:" -ForegroundColor Yellow
        Write-Host "  1. The webhook hasn't processed your payment yet (wait a few minutes)" -ForegroundColor Gray
        Write-Host "  2. You used a different email for payment" -ForegroundColor Gray
        Write-Host "  3. The server doesn't have the retrieve-license endpoint yet" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n📋 What to do next:" -ForegroundColor Cyan
Write-Host "  1. If license found: Use 'Already Purchased' in the app to retrieve it" -ForegroundColor Gray
Write-Host "  2. If not found: Check your Stripe dashboard for the payment" -ForegroundColor Gray
Write-Host "  3. If payment exists but no license: The webhook might need configuration" -ForegroundColor Gray 