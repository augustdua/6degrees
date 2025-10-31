# Test digest email template directly via Resend API

Write-Host "=== Testing Digest Email Template ===" -ForegroundColor Cyan

$RESEND_API_KEY = "re_bXNycfVJ_HFueqngZ5EnRmeNiip5P2AoP"

# Load the template
$templatePath = "backend\email-templates\unread-messages-digest.html"
$template = Get-Content $templatePath -Raw

# Replace placeholders
$html = $template -replace "{{UNREAD_COUNT}}", "5"
$html = $html -replace "{{PLURAL}}", "s"

# Send via Resend
Write-Host "`nSending test email..." -ForegroundColor Yellow

$body = @{
    from = "hello@6degree.app"
    to = @("augustduamath@gmail.com")
    subject = "🧪 TEST: Digest Email Template (Alignment Fix)"
    html = $html
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.resend.com/emails" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $RESEND_API_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $body

    Write-Host "Email sent successfully!" -ForegroundColor Green
    Write-Host "Email ID: $($response.id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check your email: augustduamath@gmail.com" -ForegroundColor Cyan
    Write-Host "The number 5 should now be perfectly centered!" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to send email!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

