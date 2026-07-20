$ErrorActionPreference = "Stop"

$repoName = "elTurista"
$ghPath = "C:\Program Files\GitHub CLI\gh.exe"

if (-not (Test-Path $ghPath)) {
  $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($ghCmd) {
    $ghPath = $ghCmd.Source
  } else {
    Write-Error "GitHub CLI not found. Install: winget install GitHub.cli, then restart the terminal."
  }
}

function gh {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  & $ghPath @Args
}

gh auth status | Out-Null

$owner = (gh api user --jq .login).Trim()
Write-Host "GitHub user: $owner"

# Bust browser cache for CSS/JS on each deploy
$cacheVersion = Get-Date -Format "yyyyMMddHHmm"
$htmlFiles = @("index.html", "privacy-policy.html", "terms-of-use.html")
foreach ($path in $htmlFiles) {
  if (-not (Test-Path $path)) { continue }
  $content = Get-Content $path -Raw
  $content = $content -replace 'assets/css/style\.css(\?v=[^"]*)?', "assets/css/style.css?v=$cacheVersion"
  $content = $content -replace 'assets/css/legal\.css(\?v=[^"]*)?', "assets/css/legal.css?v=$cacheVersion"
  $content = $content -replace 'assets/js/i18n\.js(\?v=[^"]*)?', "assets/js/i18n.js?v=$cacheVersion"
  $content = $content -replace 'assets/js/main\.js(\?v=[^"]*)?', "assets/js/main.js?v=$cacheVersion"
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $path), $content)
}
Write-Host "Asset cache version: $cacheVersion"

git add index.html privacy-policy.html terms-of-use.html 2>$null
$pending = git diff --cached --name-only
if ($pending) {
  git commit -m "Bump asset cache version to $cacheVersion"
}

$hasOrigin = [bool](git remote 2>$null | Where-Object { $_ -eq 'origin' })

if (-not $hasOrigin) {
  gh repo create $repoName --public --source=. --remote=origin --push
} else {
  git push -u origin main
}

gh api "repos/$owner/$repoName/pages" -X POST `
  -f build_type=legacy `
  -f "source[branch]=main" `
  -f "source[path]=/" 2>$null

if ($LASTEXITCODE -ne 0) {
  gh api "repos/$owner/$repoName/pages" -X PUT `
    -f build_type=legacy `
    -f "source[branch]=main" `
    -f "source[path]=/"
}

$pagesUrl = gh api "repos/$owner/$repoName/pages" --jq .html_url
Write-Host "GitHub Pages URL: $pagesUrl"
