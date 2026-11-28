# KOINEME · AZIONE EFFICACE · due fasi in un'unica animazione. Solo HTML + CSS + SVG.
import os, math
OUT=os.path.dirname(os.path.abspath(__file__))
INK='#323951'; BG='#FFFFFF'; SOFT='#C3C8D8'; GI='#ffff00'
HALO={'a':'#00ffff','v':'#00ffaa','g':'#ffff00','l':'#9aa0d6'}
XS=[50,116,184,250]; NX=150; SY,NY,DY=314,206,92
SRC=list(zip(['a','v','g','l'],XS)); DSTX=dict(zip(['g','a','l','v'],XS))
T=26.0; P='kae'; css=[]; B=[]
def p(t): return f'{max(0,min(100,t/T*100)):.3f}%'
def kf(n,fr): css.append(f'@keyframes {P}{n}{{'+''.join((t if isinstance(t,str) else p(t))+'{'+v+'}' for t,v in fr)+'}')
def an(n,e='linear'): return f'animation:{P}{n} {T}s {e} infinite'
def halo(x,y,c,r,o,st=''): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" fill-opacity="{o}" filter="url(#{P}sf)"'+(f' style="{st}"' if st else '')+'/>'
def pill(cx,cy,t,fill,col,st='none',style=''):
    w=len(t)*7.0+22
    return f'<g style="{style}"><g class="pl"><rect x="{cx-w/2:.1f}" y="{cy-11}" width="{w:.1f}" height="22" rx="11" fill="{fill}" stroke="{st}"/><text x="{cx}" y="{cy+3.9}" text-anchor="middle" fill="{col}">{t}</text></g></g>'
def bpts(p0,p1,p2,p3,n=120): return [tuple((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t**2*c+t**3*d for a,b,c,d in zip(p0,p1,p2,p3)) for t in [i/n for i in range(n+1)]]
def plen(pts): return sum(math.dist(pts[i],pts[i+1]) for i in range(len(pts)-1))
def mover(d,k,name):
    st=f"offset-path:path('{d}');offset-rotate:0deg;opacity:0;{an(name)}"
    return halo(0,0,HALO[k],13,.6,st)+f'<circle cx="0" cy="0" r="5.5" fill="{INK}" style="{st}"/>'
up=lambda x: f'M{x} {SY} C {x} {SY-50}, {NX} {NY+54}, {NX} {NY}'
upseg=lambda x: ((x,SY),(x,SY-50),(NX,NY+54),(NX,NY))

# ------- tempi -------
R0=[0.5]; STG=1.1; TRV1=1.4; BNC=0.9           # fase 1
SPLIT=6.4; SPLIT_END=7.6                               # passaggio
S2=[8.0+4.0*i for i in range(4)]; IN=1.1; PA=1.1; OUT_=1.1   # fase 2
END=S2[3]+IN+PA+OUT_+1.5; RESET=END+0.7
DIS=[S2[1],S2[2],S2[3],END]   # ognuno si dissolve quando parte il successivo                  # ≈ 34.3

# griglia e fondo
g=''.join(f'<path d="M{x} 0V400"/>' for x in range(30,300,40))+''.join(f'<path d="M0 {y}H300"/>' for y in range(20,400,40))
B.append(f'<rect width="300" height="400" fill="{BG}"/><g mask="url(#{P}vm)" stroke="{INK}" stroke-opacity=".06">{g}</g>')
# percorsi della fase 1 (tratteggio) e della fase 2 (tratteggio)
kf('f1',[('0%','opacity:1'),(SPLIT,'opacity:1'),(SPLIT_END,'opacity:0'),(END,'opacity:0'),(RESET,'opacity:1'),('100%','opacity:1')])
kf('f2',[('0%','opacity:0'),(SPLIT,'opacity:0'),(SPLIT_END,'opacity:1'),(END,'opacity:1'),(RESET,'opacity:0'),('100%','opacity:0')])
B.append(f'<g style="{an("f1")}">'+''.join(f'<path d="{up(x)}" class="att"/>' for k,x in SRC)+f'<path d="M{NX} {NY} V{DY+13}" class="att"/></g>')
full=lambda x,xd: f'M{x} {SY} C {x} {SY-50}, {NX} {NY+54}, {NX} {NY} C {NX} {NY-54}, {xd} {DY+58}, {xd} {DY}'
B.append(f'<g style="{an("f2")}">'+''.join(f'<path d="{full(x,DSTX[k])}" class="att"/>' for k,x in SRC)+'</g>')
# linee piene della fase 2
for i,(k,x) in enumerate(SRC):
    xd=DSTX[k]; L1=plen(bpts(*upseg(x))); L2=plen(bpts((NX,NY),(NX,NY-54),(xd,DY+58),(xd,DY))); fn=L1/(L1+L2)
    s=S2[i]; t1=s+IN; t2=t1+PA; t3=t2+OUT_
    kf('l'+k,[('0%','stroke-dashoffset:1;opacity:0'),(s-0.01,'stroke-dashoffset:1;opacity:0'),(s,'stroke-dashoffset:1;opacity:1'),(t1,f'stroke-dashoffset:{1-fn:.4f}'),(t2,f'stroke-dashoffset:{1-fn:.4f}'),(t3,'stroke-dashoffset:0'),(DIS[i],'stroke-dashoffset:0;opacity:1'),(DIS[i]+0.6,'stroke-dashoffset:0;opacity:0'),('100%','stroke-dashoffset:1;opacity:0')])
    B.append(f'<path d="{full(x,xd)}" pathLength="1" class="pieno" style="stroke-dasharray:1 2;{an("l"+k)}"/>')
    kf('d2'+k,[('0%','offset-distance:0%;opacity:0'),(s-0.01,'offset-distance:0%;opacity:0'),(s,'offset-distance:0%;opacity:1'),(t1,f'offset-distance:{fn*100:.3f}%'),(t2,f'offset-distance:{fn*100:.3f}%'),(t3,'offset-distance:100%;opacity:1'),(DIS[i],'offset-distance:100%;opacity:1'),(DIS[i]+0.6,'offset-distance:100%;opacity:0'),('100%','offset-distance:100%;opacity:0')])
# anello unico (fase 1)
kf('r1',[('0%','opacity:1;transform:scale(1)'),(SPLIT,'opacity:1;transform:scale(1)'),(SPLIT+0.5,'opacity:0;transform:scale(1.25)'),(END,'opacity:0;transform:scale(1)'),(RESET,'opacity:1;transform:scale(1)'),('100%','opacity:1;transform:scale(1)')])
B.append(f'<circle cx="{NX}" cy="{DY}" r="12" fill="#fff" stroke="{SOFT}" stroke-width="3" class="cx" style="{an("r1","ease-in-out")}"/>')
# i quattro anelli: nascono dall'anello unico, neutri; si colorano uno alla volta
for i,(k,x) in enumerate(SRC):
    xd=DSTX[k]; t2=S2[i]+IN+PA; t3=t2+OUT_
    kf('m'+k,[('0%',f'opacity:0;transform:translate({NX-xd}px,0)'),(SPLIT,f'opacity:0;transform:translate({NX-xd}px,0)'),(SPLIT+0.2,f'opacity:1;transform:translate({NX-xd}px,0)'),(SPLIT_END,'opacity:1;transform:translate(0,0)'),(END,'opacity:1;transform:translate(0,0)'),(RESET,'opacity:0;transform:translate(0,0)'),('100%',f'opacity:0;transform:translate({NX-xd}px,0)')])
    kf('c'+k,[('0%',f'stroke:{SOFT}'),(t2,f'stroke:{SOFT}'),(t2+0.45,f'stroke:{HALO[k]}'),(DIS[i],f'stroke:{HALO[k]}'),(DIS[i]+0.6,f'stroke:{SOFT}'),('100%',f'stroke:{SOFT}')])
    kf('h'+k,[('0%','opacity:0'),(t3-0.05,'opacity:0'),(t3+0.35,'opacity:1'),(DIS[i],'opacity:1'),(DIS[i]+0.6,'opacity:0'),('100%','opacity:0')])
    kf('e'+k,[('0%','opacity:0;transform:scale(.6)'),(t3,'opacity:0;transform:scale(.6)'),(t3+0.05,'opacity:.6;transform:scale(.6)'),(t3+0.9,'opacity:0;transform:scale(1.5)'),('100%','opacity:0;transform:scale(1.5)')])
    B.append(f'<g style="{an("m"+k,"ease-in-out")}">'
             +halo(xd,DY,HALO[k],17,.55,f'opacity:0;{an("h"+k)}')
             +f'<circle cx="{xd}" cy="{DY}" r="11" fill="#fff" stroke-width="3" style="{an("c"+k)}"/>'
             +f'<circle cx="{xd}" cy="{DY}" r="17" fill="none" stroke="{INK}" stroke-width="1.2" class="eco" style="{an("e"+k,"ease-out")}"/></g>')
# nodo giallo
B.append(halo(NX,NY,GI,25,.42)+f'<circle cx="{NX}" cy="{NY}" r="11" fill="{GI}"/><circle cx="{NX}" cy="{NY}" r="4.5" fill="{INK}"/>')
for i,(k,x) in enumerate(SRC):
    t1=S2[i]+IN; t2=t1+PA
    kf('p'+k,[('0%','opacity:0;transform:scale(1)'),(t1,'opacity:0;transform:scale(1)'),(t1+0.1,'opacity:.7;transform:scale(1)'),(t2-0.1,'opacity:.25;transform:scale(1.9)'),(t2,'opacity:0;transform:scale(2)'),('100%','opacity:0;transform:scale(2)')])
    B.append(f'<circle cx="{NX}" cy="{NY}" r="14" fill="none" stroke="{INK}" stroke-width="1.3" class="eco" style="{an("p"+k,"ease-out")}"/>')
# urti sull'anello unico
for r,r0 in enumerate(R0):
    for i in range(4):
        a=r0+STG*i+TRV1
        n=f'u{r}{i}'
        kf(n,[('0%','opacity:0'),(a-0.02,'opacity:0'),(a+0.05,'opacity:.6'),(a+0.45,'opacity:0'),('100%','opacity:0')])
        B.append(f'<path d="M{NX-11} {DY+17} l-5 4 M{NX} {DY+19} l0 6 M{NX+11} {DY+17} l5 4" stroke="{INK}" stroke-width="1.4" stroke-linecap="round" style="opacity:0;{an(n)}"/>')
# sorgenti
for i,(k,x) in enumerate(SRC):
    fr=[('0%','opacity:1')]
    for r0 in R0:
        s=r0+STG*i; fr+=[(s,'opacity:1'),(s+0.15,'opacity:0'),(s+TRV1+BNC+0.1,'opacity:0'),(s+TRV1+BNC+0.6,'opacity:1')]
    s=S2[i]; fr+=[(s,'opacity:1'),(s+0.15,'opacity:0'),(END,'opacity:0'),(RESET,'opacity:1'),('100%','opacity:1')]
    kf('s'+k,fr)
    B.append(f'<circle cx="{x}" cy="{SY}" r="5.5" fill="none" stroke="{SOFT}" stroke-width="1.5"/>')
    B.append(f'<g style="{an("s"+k)}">'+halo(x,SY,HALO[k],15,.55)+f'<circle cx="{x}" cy="{SY}" r="5.5" fill="{INK}"/></g>')
# stati della fase 1: salgono, urtano l'anello unico, rimbalzano fuori
outs=[(-1,'C 120 120, 70 84, 10 20'),(1,'C 180 120, 230 84, 290 20'),(-1,'C 116 130, 40 120, -20 70'),(1,'C 184 130, 260 120, 320 70')]
for r,r0 in enumerate(R0):
    for i,(k,x) in enumerate(SRC):
        sgn,tail=outs[(i+r)%4]
        start=(NX+sgn*6,DY+14)
        d=f'M{x} {SY} C {x} {SY-50}, {NX} {NY+54}, {NX} {NY} L{NX} {DY+15} L{start[0]} {start[1]} {tail}'
        nums=[float(v) for v in tail[2:].replace(',',' ').split()]
        c1,c2,e=(nums[0],nums[1]),(nums[2],nums[3]),(nums[4],nums[5])
        L1=plen(bpts(*upseg(x))); L2=NY-(DY+15); L3=math.dist((NX,DY+15),start); L4=plen(bpts(start,c1,c2,e))
        f=(L1+L2)/(L1+L2+L3+L4)
        s=r0+STG*i; a=s+TRV1
        n=f'd1{r}{k}'
        kf(n,[('0%','offset-distance:0%;opacity:0'),(s-0.01,'offset-distance:0%;opacity:0'),(s,'offset-distance:0%;opacity:1'),(a,f'offset-distance:{f*100:.3f}%;opacity:1'),(a+BNC,'offset-distance:100%;opacity:0'),('100%','offset-distance:100%;opacity:0')])
        B.append(mover(d,k,n))
# stati della fase 2
for i,(k,x) in enumerate(SRC): B.append(mover(full(x,DSTX[k]),k,'d2'+k))
# scritte
kf('t2',[('0%','opacity:0'),(SPLIT+0.3,'opacity:0'),(SPLIT_END+0.2,'opacity:1'),(END,'opacity:1'),(RESET,'opacity:0'),('100%','opacity:0')])
B.append(pill(NX+56,NY,'DISTINGUI',GI,INK,style=an('t2')))
B.append(pill(150,44,'AZIONE EFFICACE',INK,'#fff',style=an('t2')))
B.append(pill(150,360,'QUELLO CHE SENTI','#fff',INK,SOFT))

html=f'''<!-- KOINEME™ · AZIONE EFFICACE · blocco per un elemento di codice personalizzato di LearnWorlds. Solo HTML, CSS e SVG, nessuno script. -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo:wght@600&display=swap">
<style>
/* ALLINEAMENTO: cambia il numero qui sotto per spostare l'animazione. Negativo = più su (es. -40px), positivo = più giù (es. 30px). */
.kn-ae-w{{--sposta:0px}}
.kn-ae-w{{container-type:inline-size;max-width:400px;margin:var(--sposta) auto 0}}
.kn-ae{{width:100%;overflow:hidden;background:{BG}}}
.kn-ae svg{{display:block;width:100%;height:auto}}
.kn-ae text{{font-family:"Exo",system-ui,sans-serif;font-size:10.5px;font-weight:600;letter-spacing:.9px}}
.kn-ae .att{{fill:none;stroke:{SOFT};stroke-width:1.5;stroke-dasharray:3 5;stroke-linecap:round}}
.kn-ae .pieno{{fill:none;stroke:{INK};stroke-width:2.4;stroke-linecap:round;stroke-dashoffset:1}}
.kn-ae .eco{{opacity:0;transform-box:fill-box;transform-origin:center}}
.kn-ae .cx{{transform-box:fill-box;transform-origin:center}}
/* le scritte restano della stessa misura a ogni larghezza: un po' più piccole su schermo largo */
.kn-ae .pl{{transform-box:fill-box;transform-origin:center;transform:scale(.92)}}
@container (min-width:390px){{.kn-ae .pl{{transform:scale(.86)}}}}
{chr(10).join(css)}
@media (prefers-reduced-motion:reduce){{.kn-ae *{{animation:none!important}}}}
</style>
<div class="kn-ae-w"><figure class="kn-ae" role="img" aria-label="Quello che senti sale, passa dal giallo e arriva a un solo anello: ogni stato lo urta e rimbalza fuori. Poi compare distingui: l'anello si divide in quattro, ogni stato si ferma su distingui e raggiunge il suo anello, che prende il suo colore; quando parte il successivo, il precedente si dissolve. Azione efficace." style="margin:0 auto">
<svg viewBox="0 22 300 360" aria-hidden="true">
<defs><radialGradient id="{P}vg"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="{P}vm"><rect width="300" height="400" fill="url(#{P}vg)"/></mask>
<filter id="{P}sf" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
{chr(10).join(B)}
</svg></figure></div>
'''
open(os.path.join(OUT,'azione-efficace-embed.html'),'w').write(html)
open(os.path.join(OUT,'anteprima.html'),'w').write('<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KOINEME · azione efficace</title><style>body{margin:0;padding:32px 16px;background:#fff}</style></head><body>'+html+'</body></html>')
print('ok', round(END,1), round(RESET,1))
