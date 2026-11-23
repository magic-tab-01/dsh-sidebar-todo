param(
  [string]$Registry = 'https://registry.npmjs.org',
  [string]$Otp = ''
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$cache = Join-Path $env:TEMP 'dsh-npm-cache'
if (-not (Test-Path $cache)) {
  New-Item -ItemType Directory -Path $cache -Force | Out-Null
}

$package = Get-Content package.json -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Otp)) {
  $Otp = Read-Host 'npm 6-digit OTP'
}

Write-Host "Publishing $($package.name)@$($package.version) to $Registry ..."
npm publish --registry=$Registry --access public --otp=$Otp --cache $cache
