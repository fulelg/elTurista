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

if (-not (git remote get-url origin 2>$null)) {
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
