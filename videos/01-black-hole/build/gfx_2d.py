import math, sys, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D=sys.argv[1]; W,H=1920,1080; FPS=30
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(s): return ImageFont.truetype(FB,s)
random.seed(2)
stars=[(random.randint(0,W),random.randint(0,H),random.random()) for _ in range(500)]
def bg():
    im=Image.new('RGB',(W,H),(4,7,18)); d=ImageDraw.Draw(im)
    for x,y,b in stars:
        c=int(90+150*b); r=1 if b<0.85 else 2
        d.ellipse([x-r,y-r,x+r,y+r],fill=(c,c,min(255,c+20)))
    return im
def ease(t): return t*t*(3-2*t)
def text_c(d,y,s,size,col,alpha=1.0):
    f=font(size); w=d.textlength(s,font=f); 
    d.text(((W-w)/2,y),s,font=f,fill=(*col,int(255*alpha)))
# ---------- G1: huge mass squeezed (6.0 s)
N=int(5.8*FPS)
for i in range(N):
    t=i/(N-1); im=bg().convert('RGBA')
    glow=Image.new('RGBA',(W,H),(0,0,0,0)); g=ImageDraw.Draw(glow)
    k=ease(min(1,max(0,(t-0.15)/0.6)))
    R=380*(1-k)+14*k
    cx,cy=W/2,H/2+20
    col=(int(255),int(200-120*k),int(120-100*k))
    for j in range(6,0,-1):
        rr=R*(1+j*0.12)+j*6*k
        g.ellipse([cx-rr,cy-rr,cx+rr,cy+rr],fill=(*col,int(25+8*(6-j))))
    g.ellipse([cx-R,cy-R,cx+R,cy+R],fill=(*col,255))
    glow=glow.filter(ImageFilter.GaussianBlur(6))
    im=Image.alpha_composite(im,glow); d=ImageDraw.Draw(im)
    if k>0.98:
        # tiny black hole forming: dark core with bright ring
        d.ellipse([cx-10,cy-10,cx+10,cy+10],fill=(0,0,0,255),outline=(255,200,140,255),width=3)
    a1=min(1,t/0.12)
    text_c(d,110,'HUGE MASS',72,(255,255,255),a1)
    if t>0.55:
        a2=min(1,(t-0.55)/0.15)
        text_c(d,880,'→  TINY SPACE',72,(255,179,71),a2)
    im.convert('RGB').save(f'{D}/g1/f_{i:04d}.png')
# ---------- G2: spacetime grid (15.8 s)
N=int(15.8*FPS)
def proj(x,y,z,cam=(0,-15,8),f=1100):
    # simple pinhole: camera looks toward origin tilted
    cx,cy,cz=cam; X,Y,Z=x-cx,y-cy,z-cz
    pitch=math.atan2(cz,-cy)  # look down
    cp,sp=math.cos(pitch),math.sin(pitch)
    yy=Y*cp - Z*sp; zz=Y*sp + Z*cp
    if yy<=0.1: return None
    return (W/2+f*X/yy, H/2-f*zz/yy+60)
L=10; step=0.5
for i in range(N):
    t=i/FPS; im=bg().convert('RGBA'); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    depth=6*ease(min(1,t/3.0))
    def z(x,y):
        r=math.hypot(x,y); return -depth/(1+(r/1.1)**2)
    lines=[]
    v=-L
    while v<=L+1e-6:
        lines.append([(v,u) for u in [k*0.1 for k in range(-100,101)]])
        lines.append([(u,v) for u in [k*0.1 for k in range(-100,101)]])
        v+=step
    for ln in lines:
        pts=[proj(x,y,z(x,y)) for x,y in ln]
        pts=[p for p in pts if p]
        if len(pts)>1: d.line(pts,fill=(79,195,255,150),width=2)
    # mass at bottom of well
    bp=proj(0,0,-depth+0.25)
    if bp:
        r=26; d.ellipse([bp[0]-r,bp[1]-r,bp[0]+r,bp[1]+r],fill=(0,0,0,255),outline=(255,190,120,255),width=4)
    im=Image.alpha_composite(im,ov); dd=ImageDraw.Draw(im)
    text_c(dd,80,'MASS BENDS SPACE AND TIME',58,(255,255,255),min(1,t/0.6))
    # event horizon ring from t=3.4
    if t>3.4:
        a=min(1,(t-3.4)/0.6); rr=1.2
        ring=[proj(rr*math.cos(q),rr*math.sin(q),z(rr*math.cos(q),rr*math.sin(q))) for q in [k*2*math.pi/120 for k in range(121)]]
        ring=[p for p in ring if p]
        dd.line(ring,fill=(255,140,60,int(255*a)),width=5)
        lp=proj(1.8,-1.2,z(1.8,-1.2)+0.6)
        if lp:
            f=font(40); dd.text((lp[0]+30,lp[1]-40),'EVENT HORIZON',font=f,fill=(255,179,71,int(255*a)))
    # inward arrows from t=8.4
    if t>8.4:
        a=min(1,(t-8.4)/0.6)
        for q in range(8):
            ang=q*math.pi/4+0.3
            ph=((t-8.4)*0.5+q*0.13)%1.0
            r0=4.0-2.6*ph
            p1=proj(r0*math.cos(ang),r0*math.sin(ang),z(r0*math.cos(ang),r0*math.sin(ang)))
            p2=proj((r0-0.6)*math.cos(ang),(r0-0.6)*math.sin(ang),z((r0-0.6)*math.cos(ang),(r0-0.6)*math.sin(ang)))
            if p1 and p2:
                dd.line([p1,p2],fill=(255,255,255,int(220*a)),width=5)
                dd.ellipse([p2[0]-7,p2[1]-7,p2[0]+7,p2[1]+7],fill=(255,255,255,int(220*a)))
    if t>10.9:
        text_c(dd,900,'NO WAY BACK',76,(255,90,70),min(1,(t-10.9)/0.5))
    im.convert('RGB').save(f'{D}/g2/f_{i:04d}.png')
print('ok')
