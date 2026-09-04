# Build do backend sempre com maven-settings.xml local (Maven Central) e -U.
$ErrorActionPreference = "Stop"
$backend = Join-Path $PSScriptRoot "..\backend" | Resolve-Path
$settings = Join-Path $backend "maven-settings.xml"

if (-not $env:JAVA_HOME -or -not (Test-Path $env:JAVA_HOME)) {
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
}
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Push-Location $backend
try {
    Write-Host "JAVA_HOME=$env:JAVA_HOME"
    Write-Host "mvn -s maven-settings.xml -U -DskipTests package"
    & mvn -s $settings -U -DskipTests package @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
