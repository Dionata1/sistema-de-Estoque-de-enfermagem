# Configura a credencial do Firebase Admin fora da pasta do projeto.
# A chave privada nunca é copiada para o projeto.
$ErrorActionPreference = "Stop"
$targetDir = Join-Path $env:APPDATA "CEET-Estoque"
$target = Join-Path $targetDir "firebase-service-account.json"
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Write-Host "Selecione o JSON da Service Account do projeto ceet-enfermagem."
$source = Read-Host "Caminho completo do JSON"
if (-not (Test-Path -LiteralPath $source)) { throw "Arquivo não encontrado: $source" }
Copy-Item -LiteralPath $source -Destination $target -Force
[Environment]::SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", $target, "User")
Write-Host "Credencial instalada em: $target"
Write-Host "Feche e abra novamente o PowerShell antes de executar npm run dev."
