# KOINEME · IL BIVIO (stesso corpo, due emozioni) · per l'incontro. Solo HTML + CSS + SVG.
import os, math
OUT=os.path.dirname(os.path.abspath(__file__))
INK='#323951'; SOFT='#C3C8D8'; GI='#ffff00'
COL={'p':'#00ffaa','r':'#00ffff'}   # PAURA verde, RABBIA azzurro
CX=150; SY=318; CY=262; VY=176; RY=70; RX={'p':78,'r':222}
T=16.0; P='kbv'; css=[]; B=[]
def pc(t): return f'{max(0,min(100,t/T*100)):.3f}%'
def kf(n,fr): css.append(f'@keyframes {P}{n}{{'+''.join((t if isinstance(t,str) else pc(t))+'{'+v+'}' for t,v in fr)+'}')
def an(n,e='linear'): return f'animation:{P}{n} {T}s {e} infinite'
def halo(x,y,c,r,o,st=''): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" fill-opacity="{o}" filter="url(#{P}sf)"'+(f' style="{st}"' if st else '')+'/>'
def pill(cx,cy,t,kind,style=''):
    w=len(t)*7.0+22
    fill,st,col={'chiara':('#fff',SOFT,INK),'scura':(INK,INK,'#fff'),'gialla':(GI,'none',INK),'p':(COL['p'],'none',INK),'r':(COL['r'],'none',INK)}[kind]
    return f'<g style="{style}"><g class="pl"><rect x="{cx-w/2:.1f}" y="{cy-11}" width="{w:.1f}" height="22" rx="11" fill="{fill}" stroke="{st}"/><text x="{cx}" y="{cy+3.9}" text-anchor="middle" fill="{col}">{t}</text></g></g>'
def bl(p0,p1,p2,p3,n=200):
    L=0;pr=p0
    for i in range(1,n+1):
        t=i/n;q=tuple((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t**2*c+t**3*d for a,b,c,d in zip(p0,p1,p2,p3));L+=math.dist(pr,q);pr=q
    return L
def path(k): x=RX[k]; return f'M{CX} {SY} V{CY} V{VY} C {CX} {VY-50}, {x} {RY+60}, {x} {RY}'
# tempi di un giro
def tempi(r0): return dict(s=r0, c=r0+1.2, c2=r0+2.6, v=r0+3.4, v2=r0+4.5, a=r0+5.7, f=r0+6.9, f2=r0+7.5)
R={'p':tempi(0.4),'r':tempi(8.4)}
g=''.join(f'<path d="M{x} 0V400"/>' for x in range(30,300,40))+''.join(f'<path d="M0 {y}H300"/>' for y in range(20,400,40))
B.append(f'<rect y="12" width="300" height="360" fill="#fff"/><g mask="url(#{P}vm)" stroke="{INK}" stroke-opacity=".06">{g}</g>')
for k in 'pr': B.append(f'<path d="{path(k)}" class="att"/>')
for k in 'pr':
    t=R[k]; L1=SY-CY; L2=CY-VY; L3=bl((CX,VY),(CX,VY-50),(RX[k],RY+60),(RX[k],RY)); L=L1+L2+L3
    fc=L1/L; fv=(L1+L2)/L
    kf('l'+k,[('0%','stroke-dashoffset:1;opacity:0'),(t['s']-0.01,'stroke-dashoffset:1;opacity:0'),(t['s'],'stroke-dashoffset:1;opacity:1'),(t['c'],f'stroke-dashoffset:{1-fc:.4f}'),(t['c2'],f'stroke-dashoffset:{1-fc:.4f}'),(t['v'],f'stroke-dashoffset:{1-fv:.4f}'),(t['v2'],f'stroke-dashoffset:{1-fv:.4f}'),(t['a'],'stroke-dashoffset:0'),(t['f'],'stroke-dashoffset:0;opacity:1'),(t['f2'],'stroke-dashoffset:0;opacity:0'),('100%','stroke-dashoffset:1;opacity:0')])
    o=(SY-VY)/(SY-RY)
    B.insert(0,f'<linearGradient id="{P}gi{k}" gradientUnits="userSpaceOnUse" x1="0" y1="{SY}" x2="0" y2="{RY}"><stop offset="{o:.3f}" stop-color="{INK}"/><stop offset="1" stop-color="{COL[k]}"/></linearGradient>'
                  f'<linearGradient id="{P}ga{k}" gradientUnits="userSpaceOnUse" x1="0" y1="{SY}" x2="0" y2="{RY}"><stop offset="0" stop-color="{INK}" stop-opacity=".10"/><stop offset="{o:.3f}" stop-color="{INK}" stop-opacity=".12"/><stop offset="1" stop-color="{COL[k]}" stop-opacity=".75"/></linearGradient>')
    B.append(f'<path d="{path(k)}" pathLength="1" class="alone" stroke="url(#{P}ga{k})" filter="url(#{P}sf)" style="{an("l"+k)}"/>')
    B.append(f'<path d="{path(k)}" pathLength="1" class="pieno" stroke="url(#{P}gi{k})" style="{an("l"+k)}"/>')
    kf('d'+k,[('0%','offset-distance:0%;opacity:0'),(t['s']-0.01,'offset-distance:0%;opacity:0'),(t['s']+0.2,'offset-distance:0%;opacity:1'),(t['c'],f'offset-distance:{fc*100:.3f}%'),(t['c2'],f'offset-distance:{fc*100:.3f}%'),(t['v'],f'offset-distance:{fv*100:.3f}%'),(t['v2'],f'offset-distance:{fv*100:.3f}%'),(t['a'],'offset-distance:100%;opacity:1'),(t['f'],'offset-distance:100%;opacity:1'),(t['f2'],'offset-distance:100%;opacity:0'),('100%','offset-distance:100%;opacity:0')])
    kf('h'+k,[('0%','opacity:0'),(t['a']-0.05,'opacity:0'),(t['a']+0.4,'opacity:1'),(t['f'],'opacity:1'),(t['f2'],'opacity:0'),('100%','opacity:0')])
# anelli dei nomi
for k,lab in (('p','PAURA'),('r','RABBIA')):
    x=RX[k]
    B.append(f'<circle cx="{x}" cy="{RY}" r="11" fill="#fff" stroke="{SOFT}" stroke-width="2.5"/>')
    B.append(halo(x,RY,COL[k],18,.6,f'opacity:0;{an("h"+k)}'))
    B.append(f'<circle cx="{x}" cy="{RY}" r="11" fill="#fff" style="opacity:0;{an("h"+k)}"/>')
    B.append(pill(x,RY-30,lab,'chiara'))
    B.append(pill(x,RY-30,lab,k,f'opacity:0;{an("h"+k)}'))
# VALUTAZIONE
B.append(halo(CX,VY,GI,24,.42)+f'<circle cx="{CX}" cy="{VY}" r="11" fill="{GI}"/><circle cx="{CX}" cy="{VY}" r="4.5" fill="{INK}"/>')
for k in 'pr':
    t=R[k]
    kf('e'+k,[('0%','opacity:0;transform:scale(1)'),(t['v'],'opacity:0;transform:scale(1)'),(t['v']+0.1,'opacity:.7;transform:scale(1)'),(t['v2']-0.1,'opacity:.2;transform:scale(1.9)'),(t['v2'],'opacity:0;transform:scale(2)'),('100%','opacity:0;transform:scale(2)')])
    B.append(f'<circle cx="{CX}" cy="{VY}" r="14" fill="none" stroke="{INK}" stroke-width="1.3" class="eco" style="{an("e"+k,"ease-out")}"/>')
B.append(pill(CX+62,VY,'VALUTAZIONE','gialla'))
# CORPO e il battito: identico nei due giri (due colpi)
B.append(f'<circle cx="{CX}" cy="{CY}" r="10" fill="#fff" stroke="{INK}" stroke-width="2.4"/><circle cx="{CX}" cy="{CY}" r="4.5" fill="{INK}"/>')
for k in 'pr':
    for j,dt in enumerate((0.15,0.75)):
        t0=R[k]['c']+dt; n=f'b{k}{j}'
        kf(n,[('0%','opacity:0;transform:scale(1)'),(t0,'opacity:0;transform:scale(1)'),(t0+0.05,'opacity:.75;transform:scale(1)'),(t0+0.6,'opacity:0;transform:scale(2.7)'),('100%','opacity:0;transform:scale(2.7)')])
        B.append(f'<circle cx="{CX}" cy="{CY}" r="10" fill="none" stroke="{INK}" stroke-width="1.6" class="eco" style="{an(n,"ease-out")}"/>')
B.append(pill(CX+52,CY,'CORPO','chiara'))
B.append(f'<circle cx="{CX}" cy="{SY}" r="5.5" fill="none" stroke="{SOFT}" stroke-width="1.5"/>')
for k in 'pr': B.append(f'<circle r="5.5" fill="{INK}" style="offset-path:path(\'{path(k)}\');offset-rotate:0deg;opacity:0;{an("d"+k)}"/>')

html=f'''<!-- KOINEME™ · IL BIVIO · stesso corpo, due emozioni · blocco per un elemento di codice personalizzato di LearnWorlds. Solo HTML, CSS e SVG, nessuno script. -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo:wght@600&display=swap">
<style>
/* ALLINEAMENTO: cambia il numero qui sotto per spostare l'animazione. Negativo = più su (es. -40px), positivo = più giù (es. 30px). */
.kn-bv-w{{--sposta:0px}}
.kn-bv-w{{container-type:inline-size;max-width:400px;margin:var(--sposta) auto 0}}
.kn-bv{{width:100%;background:#fff}}
.kn-bv svg{{display:block;width:100%;height:auto}}
.kn-bv text{{font-family:"Exo",system-ui,sans-serif;font-size:10.5px;font-weight:600;letter-spacing:.9px}}
.kn-bv .att{{fill:none;stroke:{SOFT};stroke-width:1.5;stroke-dasharray:3 5;stroke-linecap:round}}
.kn-bv .alone{{fill:none;stroke-width:11;stroke-linecap:round;stroke-dasharray:1 2;stroke-dashoffset:1}}
.kn-bv .pieno{{fill:none;stroke-width:2.6;stroke-linecap:round;stroke-dasharray:1 2;stroke-dashoffset:1}}
.kn-bv .eco{{opacity:0;transform-box:fill-box;transform-origin:center}}
/* le scritte restano della stessa misura a ogni larghezza: un po' più piccole su schermo largo */
.kn-bv .pl{{transform-box:fill-box;transform-origin:center;transform:scale(.92)}}
@container (min-width:390px){{.kn-bv .pl{{transform:scale(.86)}}}}
{chr(10).join(css)}
@media (prefers-reduced-motion:reduce){{.kn-bv *{{animation:none!important}}}}
</style>
<div class="kn-bv-w"><figure class="kn-bv" role="img" aria-label="Lo stesso battito del corpo arriva alla valutazione: una volta diventa paura, una volta rabbia." style="margin:0 auto">
<svg viewBox="0 12 300 360" aria-hidden="true">
<defs><radialGradient id="{P}vg"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="{P}vm"><rect y="12" width="300" height="360" fill="url(#{P}vg)"/></mask>
<filter id="{P}sf" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
{chr(10).join(B)}
</svg></figure></div>
'''
open(os.path.join(OUT,'bivio-embed.html'),'w').write(html)
open(os.path.join(OUT,'bivio-16x9.html'),'w').write('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>KOINEME · il bivio</title><style>html,body{margin:0;background:#fff}body{width:1920px;height:1080px;display:flex;align-items:center;justify-content:center}body .kn-bv-w{width:860px;max-width:none}</style></head><body>'+html+'</body></html>')
print('ok')
