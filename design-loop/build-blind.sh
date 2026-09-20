#!/usr/bin/env bash
# Build 8-vs-8 blind A/B folders per piece. Side assignment per round is recorded in critics/blind-key.txt
cd "$(dirname "$0")/shots" || exit 1
rm -rf blind; mkdir -p blind
REF=(ref/02-hero.png ref/03-menu.png ref/07-world.png ref/08-scroll-0.png ref/08-scroll-1.png ref/08-scroll-2.png ref/08-scroll-3.png ref/08-scroll-4.png)
put(){ local d=$1; shift; mkdir -p "$d"; local i=1; for f in "$@"; do cp "$f" "$d/$(printf '%02d' $i)-frame.png"; i=$((i+1)); done; }
sample8(){ mapfile -t all < <(ls "ours/$1"/[0-9]*.png 2>/dev/null); local n=${#all[@]} i; for i in 0 1 2 3 4 5 6 7; do echo "${all[$(( i*(n-1)/7 ))]}"; done; }
declare -A SIDE=( [p1]=A [p2]=B [p3]=A [p4]=B )   # which folder holds OURS this round
for p in p1 p2 p3 p4; do
  mapfile -t OURS < <(sample8 $p)
  if [ "${SIDE[$p]}" = A ]; then put blind/$p-A "${OURS[@]}"; put blind/$p-B "${REF[@]}"; else put blind/$p-A "${REF[@]}"; put blind/$p-B "${OURS[@]}"; fi
done
{ echo "ROUND 2 — folder holding OURS:"; for p in p1 p2 p3 p4; do echo "$p: ours=${SIDE[$p]}"; done; } > ../critics/blind-key.txt
for d in blind/*/; do echo "$d $(ls $d | wc -l)"; done
