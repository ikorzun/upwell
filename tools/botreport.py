#!/usr/bin/env python3
"""The bot's plays summed up (owner, К10 «А»): each level over its part orders (PARTS=all), the chunks that cost hearts or stalled the bot
per play of them (the worst first: the pile of beats to rework), and where the hero lands in each chunk (LANDINGS=1): a strip of the shaft's
16 columns, darker where it landed more (never-used footholds, off-route landings).

  PARTS=all LANDINGS=1 PAGE=http://localhost:8794/ node tools/botrun.mjs r c1-2 c1-3 ... > plays.jsonl
  python3 tools/botreport.py plays.jsonl [more.jsonl ...] > report.md
"""
import json, sys
from collections import defaultdict

SHADES = ' .:-=+*#%@'


def load(paths):
    rows = []
    for p in paths:
        for line in open(p):
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
    return [r for r in rows if 'level' in r]


def main(paths):
    rows = load(paths)
    if not rows:
        print('no plays')
        return
    out = ['# Bot plays', '', f'{len(rows)} plays of {len({r["level"] for r in rows})} levels.', '']

    # each level over its orders
    out += ['## Levels', '', '| level | plays | time min / mean / max s | hearts | stalls | worst order |', '|---|---|---|---|---|---|']
    by_level = defaultdict(list)
    for r in rows:
        by_level[r['level']].append(r)
    for lvl, rs in by_level.items():
        t = [r['time'] for r in rs]
        worst = max(rs, key=lambda r: (r['heartsLost'], len(r['stuck']), r['time']))
        out.append(f'| {lvl} | {len(rs)} | {min(t)} / {sum(t) / len(t):.1f} / {max(t)} | {sum(r["heartsLost"] for r in rs)} | {sum(len(r["stuck"]) for r in rs)} | {worst.get("order", "-")} |')

    # chunks: hearts and stalls per play of them
    plays, hits, stalls, causes = defaultdict(int), defaultdict(int), defaultdict(int), defaultdict(lambda: defaultdict(int))
    for r in rows:
        for c in set(r.get('chunks', '').split()):
            plays[c] += 1
        for h in r.get('hits', []):
            by, _, chunk = h.partition('@')
            hits[chunk] += 1
            causes[chunk][by or '?'] += 1
        for s in r.get('stuck', []):
            stalls[s.split('@')[0]] += 1
    out += ['', '## Chunks: hearts and stalls per play', '', '| chunk | plays | hearts | stalls | per play | what hit |', '|---|---|---|---|---|---|']
    ranked = sorted(plays, key=lambda c: -(hits[c] + stalls[c]) / plays[c])
    for c in ranked:
        if not hits[c] and not stalls[c]:
            continue
        what = ', '.join(f'{k} {v}' for k, v in sorted(causes[c].items(), key=lambda kv: -kv[1]))
        out.append(f'| {c} | {plays[c]} | {hits[c]} | {stalls[c]} | {(hits[c] + stalls[c]) / plays[c]:.2f} | {what} |')

    # landings: where in each chunk's 16 columns the hero lands
    land = defaultdict(lambda: [0] * 16)
    for r in rows:
        for chunk, col, _h in r.get('landings', []):
            if 0 <= col < 16:
                land[chunk][col] += 1
    if land:
        out += ['', '## Landings by chunk (16 columns, wall to wall; darker = more)', '', '```']
        for c in sorted(land, key=lambda c: -sum(land[c])):
            n, top = sum(land[c]), max(land[c])
            strip = ''.join(SHADES[min(len(SHADES) - 1, round((len(SHADES) - 1) * v / top))] if v else ' ' for v in land[c])
            out.append(f'{c:<14} |{strip}| {n}')
        out.append('```')
    print('\n'.join(out))


if __name__ == '__main__':
    main(sys.argv[1:])
