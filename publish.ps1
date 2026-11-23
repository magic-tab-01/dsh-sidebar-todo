param(
  [string]$Registry = 'https://registry.npmjs.org'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$cache = Join-Path $env:TEMP 'dsh-npm-cache'
if (-not (Test-Path $cache)) {
  New-Item -ItemType Directory -Path $cache -Force | Out-Null
}

Write-Host "Publishing $(Get-Content package.json -Raw | ConvertFrom-Json | Select-Object -ExpandProperty name) to $Registry ..."
npm publish --registry=$Registry --access public --cache $cache
