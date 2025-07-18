# PowerShell script to set up daily Illuvium data fetching
# Run this script as Administrator

param(
    [string]$ProjectPath = "C:\Users\richa\guideoverlay",
    [string]$PythonPath = "python"
)

Write-Host "Setting up daily Illuvium data fetching task..." -ForegroundColor Green

# Create the task action
$Action = New-ScheduledTaskAction -Execute $PythonPath -Argument "illuvium_data_fetcher.py" -WorkingDirectory $ProjectPath

# Create the trigger (run daily at 2 AM)
$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00"

# Create task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Create the task
$Task = New-ScheduledTask -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily Illuvium data fetching for DataKingz Overlay"

# Register the task
Register-ScheduledTask -TaskName "IlluviumDataFetch" -InputObject $Task -User "SYSTEM" -Force

Write-Host "✅ Task 'IlluviumDataFetch' created successfully!" -ForegroundColor Green
Write-Host "📅 Will run daily at 2:00 AM" -ForegroundColor Yellow
Write-Host "🔧 To modify: Open Task Scheduler > Task Scheduler Library > IlluviumDataFetch" -ForegroundColor Cyan

# Test the task
Write-Host "🧪 Testing the task..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "IlluviumDataFetch"

Write-Host "✅ Task started! Check latest_illuvium_builds.json for results." -ForegroundColor Green 