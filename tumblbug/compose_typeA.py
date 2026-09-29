import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
S=2; N=1000*S
random.seed(7)
GOLD=(214,178,106)

# ---------- background ----------
def radial(size, inner, outer, center, radius):
    w,h=size; cx,cy=center
    g=Image.new('L',(w,h))
    px=g.load()
    for y in range(0,h,4):
        for x in range(0,w,4):
            d=min(1,math.hypot(x-cx,y-cy)/radius)
            v=int(255*d)
            for yy in range(y,min(y+4,h)):
                for xx in range(x,min(x+4,w)): px[xx,yy]=v
    g=g.filter(ImageFilter.GaussianBlur(6))
    return Image.composite(Image.new('RGB',size,outer),Image.new('RGB',size,inner),g)

bg=radial((N,N),(28,44,96),(6,10,32),(N*0.5,N*0.42),N*0.78)

# faint nebula glows
glow=Image.new('RGB',(N,N),(0,0,0)); gd=ImageDraw.Draw(glow)
for (x,y,r,c) in [(0.5,0.35,0.30,(50,80,160)),(0.18,0.2,0.22,(70,50,130)),(0.85,0.25,0.2,(40,70,140))]:
    gd.ellipse([(x-r)*N,(y-r)*N,(x+r)*N,(y+r)*N],fill=c)
glow=glow.filter(ImageFilter.GaussianBlur(120*S))
bg=ImageChops.add(bg,Image.eval(glow,lambda v:int(v*0.45)))

lay=Image.new('RGBA',(N,N),(0,0,0,0)); d=ImageDraw.Draw(lay)

# tiny stars
for _ in range(420):
    x,y=random.random()*N,random.random()*N
    r=random.choice([0.6,0.8,1,1,1.4,2])*S
    a=random.randint(60,200)
    d.ellipse([x-r,y-r,x+r,y+r],fill=(235,235,255,a))
# a few sparkle stars
def sparkle(x,y,L,a):
    d.line([x-L,y,x+L,y],fill=(255,240,210,a),width=S)
    d.line([x,y-L,x,y+L],fill=(255,240,210,a),width=S)
    d.ellipse([x-2*S,y-2*S,x+2*S,y+2*S],fill=(255,250,235,min(255,a+40)))
for (x,y,L) in [(0.08,0.08,14),(0.93,0.1,12),(0.62,0.06,9),(0.3,0.05,10),(0.96,0.55,9),(0.04,0.6,10)]:
    sparkle(x*N,y*N,L*S,150)

# constellations (subtle gold lines)
cons=[[(0.06,0.14),(0.13,0.1),(0.2,0.16),(0.17,0.25),(0.26,0.3)],
      [(0.72,0.06),(0.8,0.12),(0.9,0.09),(0.95,0.18),(0.87,0.24)],
      [(0.36,0.12),(0.42,0.07),(0.5,0.1)]]
for c in cons:
    pts=[(x*N,y*N) for x,y in c]
    d.line(pts,fill=GOLD+(70,),width=S)
    for x,y in pts:
        d.ellipse([x-3*S,y-3*S,x+3*S,y+3*S],fill=(255,236,190,170))

# atom orbits behind center
ol=Image.new('RGBA',(N,N),(0,0,0,0)); od=ImageDraw.Draw(ol)
cx,cy=N*0.5,N*0.38; rx,ry=N*0.43,N*0.14
for ang in (0,60,120):
    e=Image.new('RGBA',(N,N),(0,0,0,0)); ed=ImageDraw.Draw(e)
    ed.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],outline=(150,190,255,60),width=2*S)
    # electron
    t=math.radians(35+ang)
    ex,ey=cx+rx*math.cos(t),cy+ry*math.sin(t)
    ed.ellipse([ex-5*S,ey-5*S,ex+5*S,ey+5*S],fill=(200,225,255,150))
    e=e.rotate(ang,center=(cx,cy),resample=Image.BICUBIC)
    ol=Image.alpha_composite(ol,e)
od=ImageDraw.Draw(ol)
od.ellipse([cx-N*0.36,cy-N*0.36,cx+N*0.36,cy+N*0.36],outline=GOLD+(45,),width=S)
od.ellipse([cx-N*0.38,cy-N*0.38,cx+N*0.38,cy+N*0.38],outline=GOLD+(30,),width=S)
# hexagon
hex_=[(cx+N*0.30*math.cos(math.radians(30+60*k)),cy+N*0.30*math.sin(math.radians(30+60*k))) for k in range(7)]
od.line(hex_,fill=GOLD+(40,),width=S)
lay=Image.alpha_composite(lay,ol)

bg=Image.alpha_composite(bg.convert('RGBA'),lay)

# ---------- characters ----------
def load(name,scale):
    im=Image.open(f'cut/{name}.png').convert('RGBA')
    im=im.resize((int(im.width*scale*S),int(im.height*scale*S)),Image.LANCZOS)
    a=im.getchannel('A').point(lambda v:0 if v<20 else v)  # drop faint haze
    # feather edges where the original artwork was cropped by its frame
    w,h=im.size; F=int(70*S)
    ramp=Image.new('L',(w,h),255); rp=ramp.load()
    import numpy as np
    A=np.array(a,dtype=np.float32)/255
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    m=np.ones((h,w),np.float32)
    for side,dist in [('t',yy),('b',h-1-yy),('l',xx),('r',w-1-xx)]:
        edge={'t':A[0,:],'b':A[-1,:],'l':A[:,0],'r':A[:,-1]}[side]
        if edge.max()>0.05: m*=np.clip(dist/F,0,1)**1.2
    im.putalpha(Image.fromarray((A*m*255).astype('uint8'))); return im

def place(canvas,im,x,y,shadow=True,rim=None):
    x,y=int(x*S),int(y*S)
    if shadow:
        sh=Image.new('RGBA',im.size,(3,6,20,0)); sh.putalpha(im.getchannel('A').point(lambda v:int(v*0.75)))
        sh=sh.filter(ImageFilter.GaussianBlur(14*S))
        canvas.alpha_composite(sh,(x+6*S,y+10*S))
    if rim:
        r=Image.new('RGBA',im.size,rim+(0,)); r.putalpha(im.getchannel('A').filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(6*S)).point(lambda v:int(v*0.35)))
        canvas.alpha_composite(r,(x,y))
    canvas.alpha_composite(im,(x,y))

C=bg.copy()
# (name, scale, x, y) in 1000px space, back to front
L=[('5_isnet-anime',0.66,-290,175,(255,140,60)),
   ('2_isnet-anime',0.66,585,160,(255,190,215)),
   ('4_isnet-anime',0.54,-95,505,(255,120,120)),
   ('1_birefnet-general',0.60,180,0,(140,190,255)),
   ('3_birefnet-general',0.56,405,425,(255,110,60))]
for n,s,x,y,rim in L:
    place(C,load(n,s),x,y,rim=rim)

# bottom fade to hide hard crop edges
f=Image.new('L',(1,N))
for yy in range(N):
    t=max(0,(yy-N*0.84)/(N*0.16)); f.putpixel((0,yy),int(255*min(1,t)**1.4))
f=f.resize((N,N))
C=Image.composite(Image.new('RGBA',(N,N),(6,10,32,255)),C,f)

# gold frame
fd=ImageDraw.Draw(C)
m=18*S
fd.rectangle([m,m,N-m,N-m],outline=GOLD+(200,),width=2*S)
m2=26*S
fd.rectangle([m2,m2,N-m2,N-m2],outline=GOLD+(90,),width=S)
for (px,py,sx,sy) in [(m,m,1,1),(N-m,m,-1,1),(m,N-m,1,-1),(N-m,N-m,-1,-1)]:
    L1=60*S
    fd.line([(px,py+sy*L1),(px,py),(px+sx*L1,py)],fill=GOLD+(255,),width=4*S)
    dx,dy=px+sx*14*S,py+sy*14*S
    fd.polygon([(dx,dy-7*S),(dx+7*S,dy),(dx,dy+7*S),(dx-7*S,dy)],fill=GOLD+(255,))

out=C.convert('RGB').resize((1000,1000),Image.LANCZOS)
import os; os.makedirs('/home/user/ENTJ/tumblbug',exist_ok=True)
out.save('/home/user/ENTJ/tumblbug/wonsoyeonhee_typeA_1000.png',optimize=True)
out.save('scratchpad/preview.png')
