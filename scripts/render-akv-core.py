"""Render the AKV comparison assets from diagram primitives using Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

OUT = Path(__file__).resolve().parents[1] / 'projects/akv/static/figures'
W, H, S = 760, 256, 2
FPS, SECONDS = 12, 14
INK, MUTED = '#25262a', '#797d84'
# Amber fill / stroke from the supplied R2R System Figures style palette.
COLORS = {'A': ('#FFEDD5', '#F59E0B'), 'B': ('#dcebcf', '#86a46b'), 'C': ('#dce9fa', '#85a8d3')}
MEMORY, GREEN = COLORS['A'][1], COLORS['B'][1]
X = {'A': 126, 'B': 329, 'C': 532}
FONTS = {}

def font(size, bold=False):
    key = (size, bold)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf', round(size*S))
    return FONTS[key]

def blend(color, alpha):
    return tuple(round(255+(int(color[i:i+2],16)-255)*alpha) for i in (1,3,5))

def ramp(t, start, duration):
    v = max(0, min(1, (t-start)/duration))
    return v*v*(3-2*v)

def frame(kind, t):
    ours = kind == 'cache'
    im = Image.new('RGB', (W*S,H*S), 'white')
    d = ImageDraw.Draw(im)
    def box(bounds, fill, edge=None, radius=7, width=1):
        d.rounded_rectangle(tuple(round(v*S) for v in bounds),radius=round(radius*S),fill=fill,outline=edge,width=round(width*S))
    def text(x,y,value,size=17,color=INK,bold=False,center=False):
        d.text((round(x*S),round(y*S)),value,font=font(size,bold),fill=color,anchor='mt' if center else 'lt')
    def dash(bounds, color):
        x,y,w,h=bounds
        # Broken outline means unavailable for current attention, not deallocated.
        for a in range(5,int(w)-4,10):
            for b in (y,y+h):
                d.line(((x+a)*S,b*S,(x+min(a+5,w-4))*S,b*S),fill=color,width=2)
        for a in range(5,int(h)-4,10):
            for b in (x,x+w):
                d.line((b*S,(y+a)*S,b*S,(y+min(a+5,h-4))*S),fill=color,width=2)

    text(24,15,'Cache Engineering' if ours else 'Context Engineering',21,INK,True)
    text(24,75,'Message',17,INK,True)
    text(24,163,'Cache',17,INK,True)
    for name in ('A','B','C'):
        # A's message is removed outright in context engineering.
        if name == 'A' and not ours and t >= 2.4:
            continue
        x = X[name]
        fill,edge = COLORS[name]
        box((x,63,x+174,107),fill,edge)
        text(x+87,74,name,21,INK,True,True)

    def caches(name, history=False, inherited=False, inactive=0, appear=None, dx=0,dy=0):
        x,y=X[name]+dx,143+dy
        fill,edge=COLORS[name]
        for i in range(3):
            opacity = 1 if appear is None else ramp(t,appear+i*.48,.28)
            if opacity == 0: continue
            left=x+i*60
            alpha=opacity*(1-.86*inactive)
            box((left,y,left+54,y+61),blend(fill,alpha),None if inactive>.95 else blend(edge,alpha))
            if inactive>0:
                dash((left,y,54,61),blend('#9da3ab',opacity*inactive*.55))
            if history:
                box((left+7,y+32,left+47,y+51),blend(MEMORY,alpha),radius=3)
            if inherited:
                box((left+7,y+22,left+47,y+51),blend(GREEN,alpha),radius=3)
                if ours:
                    box((left+12,y+37,left+42,y+47),blend(MEMORY,alpha),radius=2)

    # Initial state is held. Both approaches use the same fading interval.
    inactive = ramp(t,3.2,.8)
    caches('A', inactive=inactive)
    caches('B', history=True, inactive=0 if ours else inactive)
    if ours:
        # Retained B stays exactly unchanged; only C is prefilled.
        caches('C', inherited=True, appear=5.0)
    else:
        # Fresh B is built in the same message column, in front of its old ghost.
        # It is recomputed from edited text, without asserting all A information
        # is absent from the text itself.
        caches('B', appear=5.0, dx=10, dy=10)
        caches('C', inherited=True, appear=7.4)

    text(24,233,'Inset blocks represent information carried from earlier messages.',12.5,MUTED)
    return im.resize((W,H),Image.Resampling.LANCZOS)

if __name__ == '__main__':
    for kind in ('context','cache'):
        frames=[frame(kind,i/FPS).quantize(colors=112,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE) for i in range(FPS*SECONDS)]
        dest=OUT/f'{kind}-engineering-compact.gif'
        durations=[80 if i%3!=2 else 90 for i in range(len(frames))]
        frames[0].save(dest,save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True,disposal=2)
        frame(kind,11).save(OUT/f'{kind}-engineering-compact.png')
        with Image.open(dest) as gif:
            print(dest.name, gif.size, gif.n_frames, sum(f.info.get('duration',0) for f in ImageSequence.Iterator(gif)), dest.stat().st_size)
