#!/usr/bin/env python3
"""Variants of one world element, drawn by OpenAI's GPT Image, to choose a look before it is coded (owner 2026-10-19: a prompt
for OpenAI that offers different variants of one detail; the owner picks one, and it is then drawn in code).

Each element is described the way the parts catalog does (https://claude.ai/artifact/CPtyrzSxgfXjWWmYtzpQEx): its world, what it
is, what it does in play, its material and its size in tiles. The prompt carries the game's own rules (the nine inks and what
they mean, the black night, dithered shading, side view, the hero for scale), and asks for flat boxes and discs, so whichever
variant is picked can be drawn with the renderer's own.

    python3 tools/variants.py list              # the elements described so far
    python3 tools/variants.py <id> --prompt     # print the prompt, to paste into ChatGPT by hand
    python3 tools/variants.py <id>              # one 3 x 2 sheet of six variants, A to F: research/variants/<id>-<n>.png

Needs OPENAI_API_KEY: from the shell, or else from "env" in ~/.claude/settings.json, where Claude Code keeps it for its own tools
only. The gpt-image skill's script makes the call.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.expanduser('~/.claude/skills/gpt-image/scripts/gpt_image.py')

# world: (name, what it is like, its own ink, what the other inks already mean there)
WORLDS = {
    'tokyo': ('Tokyo', 'a Japanese suburb at night: narrow alleys between small houses and apartment blocks, power lines, vending '
              'machines, shop signs', 'blue #5bb8ff', 'purple marks moving platforms and grey blocks crumble'),
}
# element: (world, what it is, what it does in play, material, size)
ELEMENTS = {
    'tokyo-slab': ('tokyo', 'the basic ledge, a solid ledge sticking out of the shaft wall',
                   'solid on every side: you stand on it, cling to its sides and jump off it',
                   'concrete, as on the houses and apartment blocks of the suburb', '4 tiles long and 1 tile thick'),
}

PROMPT = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: a small round white hero climbs up a narrow shaft at night.
One element of the world "{world}" ({mood}): {what}.
In play: {does}. Material: {material}. Size: {size}; one tile is 16 art pixels, and the hero is 2 tiles (32 art pixels) wide.
Draw six different design variants of this same element in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: the black night with sparse dots of {ink_name} (far windows), the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), the element sticking out of that wall in flat side view at game scale, and the hero standing on it for scale: a soft round white blob 2 tiles across with two small black eyes.
Keep in every variant: the same size, the same job in play, a white top edge to stand on, {ink_name} as its main colour.
Vary between the variants: the silhouette and edge profile, how its free end is finished, how it is fixed to the wall, its surface pattern and joints, and the small details on it. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
Strict style: pixel art; hard pixel edges, no anti-aliasing, no gradients, no glow, no blur; shading only with an ordered 4x4 dither. Use only these nine colours: black #141414, white #f3f3f3, grey #c8c8c8, blue #5bb8ff, orange #faa23e, purple #c996ff, green #339c39, red #f43e34, yellow #ffed57. The world's own colour is {ink}. In this world {taken}, so use those only for small details. White only for edges you stand on or cling to and for the hero; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""


def prompt(el: str) -> str:
    w, what, does, material, size = ELEMENTS[el]
    name, mood, ink, taken = WORLDS[w]
    return PROMPT.format(world=name, mood=mood, what=what, does=does, material=material, size=size, ink=ink, ink_name=ink.split()[0], taken=taken)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args or args[0] == 'list':
        for el, (w, what, *_rest) in ELEMENTS.items():
            print(f'{el}: {WORLDS[w][0]}, {what}')
        return
    el = args[0]
    if el not in ELEMENTS:
        sys.exit(f'no element {el!r}; see: python3 tools/variants.py list')
    if '--prompt' in sys.argv:
        print(prompt(el))
        return
    out, env = os.path.join(ROOT, 'research', 'variants'), dict(os.environ)
    if not env.get('OPENAI_API_KEY'):
        try:
            with open(os.path.expanduser('~/.claude/settings.json')) as f:
                env['OPENAI_API_KEY'] = json.load(f).get('env', {}).get('OPENAI_API_KEY', '')
        except (OSError, ValueError):
            pass
    if not env.get('OPENAI_API_KEY'):
        sys.exit('No OpenAI key: set OPENAI_API_KEY, or put it under "env" in ~/.claude/settings.json.')
    try:   # python.org's Python has no root certificates of its own (as in audio.py)
        import certifi
        env.setdefault('SSL_CERT_FILE', certifi.where())
    except ImportError:
        pass
    n = 1   # each sheet is kept: they cost money
    while os.path.exists(os.path.join(out, f'{el}-{n}.png')):
        n += 1
    sys.exit(subprocess.run(['python3', SCRIPT, prompt(el), '--model', 'flare', '--quality', 'medium', '--size', '1536x1024', '--out', out, '--name', f'{el}-{n}'], env=env).returncode)


if __name__ == '__main__':
    main()
