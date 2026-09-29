#!/usr/bin/env bash
# The weekly numbers for docs/ceo/weekly.md. Needs curl, node and an authenticated gh.
# Usage: bash docs/ceo/metrics.sh [YYYY-MM-DD, the Monday that starts the week, default this week]
set -euo pipefail

OWNERS='rxova|jonatankruszewski'
PACKAGES=(use-everywhere ts-extended-errors overlock @rxova/react-inputs @rxova/journey-core)
REPOS=(journey react-inputs use-everywhere ts-extended-errors overlock)

monday=${1:-$(node -e 'const d=new Date();d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));console.log(d.toISOString().slice(0,10))')}
day() { node -e "const d=new Date('$monday');d.setUTCDate(d.getUTCDate()+$1);console.log(d.toISOString().slice(0,10))"; }
from=$(day -7)
to=$(day -1)
json() { node -pe "const j=JSON.parse(require('fs').readFileSync(0));$1"; }

echo "Week ending $to"
echo
echo "North star: external repos depending on an rxova package (GitHub code search)"
total=0
for p in "${PACKAGES[@]}"; do
  q=$(node -pe "encodeURIComponent('\"\\\"$p\\\"\" filename:package.json')")
  n=$(gh api "search/code?q=$q&per_page=100" \
    --jq "[.items[].repository | select(.owner.login | test(\"^($OWNERS)\$\"; \"i\") | not) | .full_name] | unique | length")
  echo "  $p: $n"
  total=$((total + n))
  sleep 7 # code search allows 10 requests a minute
done
echo "  total: $total"
echo
echo "Input: npm downloads, $from..$to"
for p in "${PACKAGES[@]}"; do
  n=$(curl -fsS "https://api.npmjs.org/downloads/range/$from:$to/$p" | json 'j.downloads.reduce((a,d)=>a+d.downloads,0)')
  echo "  $p: $n"
done
echo
echo "Input: GitHub stars"
for r in "${REPOS[@]}"; do
  echo "  $r: $(gh api "repos/rxova/$r" --jq .stargazers_count)"
done
echo
echo "Input: issues and PRs opened by people outside the org, $from..$to"
gh api "search/issues?q=org:rxova+-author:jonatankruszewski+-author:app/dependabot+-author:app/renovate+-author:app/github-actions+-author:app/claude+created:$from..$to" \
  --jq '"  \(.total_count)", (.items[] | "    \(.repository_url | split("/") | last): \(.user.login): \(.title)")'
echo
echo "Input: docs visits from outside referrers: read by hand from Cloudflare Web Analytics,"
echo "  site rxova.dev, last 7 days, Referrers, excluding rxova.dev and github.com/rxova."
