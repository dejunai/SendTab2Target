param(
    [string]$ManifestPath = "$PSScriptRoot\manifest.json",
    [string]$ExtensionId = ""
)

$manifestFull = Resolve-Path $ManifestPath | Select-Object -ExpandProperty Path
$parentKeyVivaldi = "HKCU:\Software\Vivaldi\NativeMessagingHosts"
$parentKeyChrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts"
$hostName = "com.browser.bridge"

if (-not (Test-Path $parentKeyVivaldi)) { New-Item -Path $parentKeyVivaldi -Force | Out-Null }
if (-not (Test-Path $parentKeyChrome)) { New-Item -Path $parentKeyChrome -Force | Out-Null }

New-Item -Path "$parentKeyVivaldi\$hostName" -Force | Out-Null
Set-Item -Path "$parentKeyVivaldi\$hostName" -Value $manifestFull -Force

New-Item -Path "$parentKeyChrome\$hostName" -Force | Out-Null
Set-Item -Path "$parentKeyChrome\$hostName" -Value $manifestFull -Force

Write-Host "Registered $hostName successfully in both Vivaldi and Chrome registry paths."
