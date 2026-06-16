$ErrorActionPreference = "Stop"

$repoName = "elTurista"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) is not installed. Run: winget install GitHub.cli"
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
