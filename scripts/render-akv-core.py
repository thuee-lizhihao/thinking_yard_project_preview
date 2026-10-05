"""Render the AKV two-row comparison assets from diagram primitives (Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

OUT = Path(__file__).resolve().parents[1] / 'projects/akv/static/figures'
W, H, S = 720, 204, 2
FPS, SECONDS = 10, 12
INK, MUTED = '#24242a', '#777780'
GREY, GREY_EDGE, MEMORY = '#ededf0', '#b5b5bf', '#a5a5b2'
GREEN, GREEN_EDGE, GREEN_INK = '#e5efdc', '#8ba877', '#456636'
BLUE, BLUE_EDGE, BLUE_INK = '#e4edfb', '#94afd5', '#476e9c'
ORANGE, ORANGE_INK = '#faeadc', '#a36b40'
FONTS = {}

def font(size, bold=False):
    key = (size, bold)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf', size*S)
    return FONTS[key]

def tint(color, opacity):
    return tuple(round(255 + (int(color[n:n+2],16)-255)*opacity) for n in (1,3,5))

def frame(kind, t):
    image = Image.new('RGB', (W*S,H*S), 'white')
    d = ImageDraw.Draw(image)
    ours = kind == 'cache'
    phase = 0 if t < 2.4 else 1 if t < 4.8 else 2 if t < 9 else 3
    def box(bounds, fill, edge=None, radius=8, width=1):
        d.rounded_rectangle(tuple(round((v - (52 if i % 2 else 0))*S) for i,v in enumerate(bounds)), radius=radius*S, fill=fill, outline=edge, width=width*S)
    def text(x,y,value,size=17,color=INK,bold=False,center=False):
        d.text((round(x*S),round((y-52)*S)),value,font=font(size,bold),fill=color,anchor='mt' if center else 'lt')
    def line(points,color,width=1):
        d.line([(round(x*S),round((y-52)*S)) for x,y in points],fill=color,width=width*S)
    def cross(x,y,w,h):
        line([(x+6,y+6),(x+w-6,y+h-6)],'#b9b9c2')
        line([(x+6,y+h-6),(x+w-6,y+6)],'#b9b9c2')
    def arrow(x,progress,color):
        line([(x,128),(x,157)],'#dedee5')
        line([(x-4,153),(x,157),(x+4,153)],'#dedee5')
        if progress is not None:
            y=130+22*progress
            box((x-4,y-3,x+4,y+3),color,radius=2)

    text(22,85,'Message',17,INK,True)
    text(22,188,'Cache',17,INK,True)
    xA,wA,xB,wB,xQ,wQ = 125,150,293,221,532,164
    ym,hm,yc,hc = 74,49,169,65
    fade = max(0,min(1,(t-2.4)/.7))
    a_message_opacity=1 if ours else 1-.8*fade
    box((xA,ym,xA+wA,ym+hm),tint(GREY,a_message_opacity),tint(GREY_EDGE,a_message_opacity))
    text(xA+wA/2,ym+14,'A · Earlier',17,tint(INK,a_message_opacity),True,True)
    if not ours and t>2.8: cross(xA,ym,wA,hm)
    box((xB,ym,xB+wB,ym+hm),GREEN,GREEN_EDGE)
    text(xB+wB/2,ym+14,'B · Retained',17,GREEN_INK,True,True)
    q_alpha=max(0,min(1,(t-.2)/.7))
    q_shift=round(8*(1-q_alpha))
    box((xQ+q_shift,ym,xQ+wQ+q_shift,ym+hm),tint(BLUE,q_alpha),tint(BLUE_EDGE,q_alpha))
    text(xQ+wQ/2+q_shift,ym+14,'Q · New',17,tint(BLUE_INK,q_alpha),True,True)

    a_cache_opacity=1-.86*fade
    box((xA,yc,xA+wA,yc+hc),tint(GREY,a_cache_opacity),tint(GREY_EDGE,a_cache_opacity))
    text(xA+wA/2,yc+22,'KV of A',17,tint(MUTED,a_cache_opacity),True,True)
    if t>2.8: cross(xA,yc,wA,hc)

    invalid=not ours and 2.8<=t<4.8
    rebuild=not ours and 4.8<=t<6.8
    b_alpha=.3 if invalid else 1
    box((xB,yc,xB+wB,yc+hc),tint(ORANGE if rebuild else GREEN,b_alpha),tint(ORANGE_INK if rebuild else GREEN_EDGE,b_alpha),width=2 if ours and phase>=1 else 1)
    if ours: b_label='B · Reused' if phase>=1 else 'KV of B'
    else: b_label='B · Invalid' if invalid else 'B · Re-prefill' if rebuild else 'B · Recomputed' if t>=6.8 else 'KV of B'
    text(xB+wB/2,yc+9,b_label,17,tint(ORANGE_INK if rebuild else GREEN_INK,b_alpha),True,True)
    # This inset depicts the original state's historical conditioning, not a
    # promise that text edits erase every trace of A from the retained text.
    if ours or t<4.8:
        box((xB+12,yc+37,xB+wB-12,yc+56),tint(MEMORY,b_alpha),radius=4)
        text(xB+wB/2,yc+39,'A\'s influence',12,tint('#ffffff',b_alpha),False,True)
    elif rebuild:
        progress=(t-4.8)/2
        box((xB+12,yc+45,xB+wB-12,yc+50),'#eddbcc',radius=2)
        box((xB+12,yc+45,xB+12+max(1,(wB-24)*progress),yc+50),ORANGE_INK,radius=2)
    if invalid: cross(xB,yc,wB,hc)
    if ours and phase>=1:
        text(xB+wB/2,139,'No re-prefill',14,GREEN_INK,True,True)
    elif rebuild:
        arrow(xB+wB/2,((t-4.8)*1.5)%1,ORANGE_INK)
        text(xB+8,139,'Re-prefill',12,ORANGE_INK)

    q_start=4.8 if ours else 6.8
    if t>=q_start:
        progress=max(0,min(1,(t-q_start)/2))
        box((xQ,yc,xQ+wQ,yc+hc),BLUE,BLUE_EDGE)
        text(xQ+wQ/2,yc+9,'KV of Q',17,BLUE_INK,True,True)
        if progress<1:
            box((xQ+12,yc+45,xQ+wQ-12,yc+50),'#d3e0f3',radius=2)
            box((xQ+12,yc+45,xQ+12+max(1,(wQ-24)*progress),yc+50),BLUE_INK,radius=2)
            arrow(xQ+wQ/2,((t-q_start)*1.5)%1,BLUE_INK)
            text(xQ+4,139,'Prefill',12,BLUE_INK)
        else:
            box((xQ+12,yc+37,xQ+wQ-12,yc+56),GREEN_EDGE,radius=4)
            if ours: box((xQ+20,yc+46,xQ+wQ-20,yc+53),MEMORY,radius=2)
    else:
        box((xQ,yc,xQ+wQ,yc+hc),'#fafafd','#e4e4eb')
    return image.resize((W,H),Image.Resampling.LANCZOS)

if __name__=='__main__':
    for kind in ['context','cache']:
        images=[frame(kind,i/FPS).quantize(colors=96,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE) for i in range(FPS*SECONDS)]
        dest=OUT/f'{kind}-engineering-compact.gif'
        images[0].save(dest,save_all=True,append_images=images[1:],duration=1000//FPS,loop=0,optimize=True,disposal=2)
        print(dest.name,dest.stat().st_size)
        frame(kind,10).save(OUT/f'{kind}-engineering-compact.png')
    for path in OUT.glob('*-compact.gif'):
        with Image.open(path) as gif:
            print(path.name,gif.size,gif.n_frames,sum(f.info.get('duration',0) for f in ImageSequence.Iterator(gif)))
