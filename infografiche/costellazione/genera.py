# KOINEME · LA COSTELLAZIONE · cinque stati, collegati attraverso KOINEME. Solo HTML + CSS + SVG.
import os, math
OUT=os.path.dirname(os.path.abspath(__file__))
INK='#323951'; SOFT='#C3C8D8'; GI='#ffff00'
COLS=['#00ffff','#9aa0d6','#ffff00','#00ffaa','#323951']      # azzurro, lilla, giallo, verde, blu
PTS=[(50,88),(236,62),(262,250),(214,334),(66,288)]
W=(140,190)
T=18.4; P='kco'; css=[]; B=[]
def pc(t): return f'{max(0,min(100,t/T*100)):.3f}%'
def kf(n,fr): css.append(f'@keyframes {P}{n}{{'+''.join((t if isinstance(t,str) else pc(t))+'{'+v+'}' for t,v in fr)+'}')
def an(n,e='linear'): return f'animation:{P}{n} {T}s {e} infinite'
def halo(x,y,c,r,o,st=''): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{c}" fill-opacity="{o}" filter="url(#{P}sf)"'+(f' style="{st}"' if st else '')+'/>'
def side(x): return W[0]+(34 if x>W[0] else -34)
def curve(p):
    x,y=p; wx,wy=W; sx=side(x)
    return f'M{sx} {wy} C {sx+(x-sx)*0.75:.1f} {wy}, {x:.1f} {wy+(y-wy)*0.3:.1f}, {x:.1f} {y:.1f}'
ORD=[0,1,2,3,4]
C=[4.8+1.8*i for i in range(5)]; DRAW=1.0          # quando parte ogni collegamento
END=C[-1]+DRAW+2.8; RESET=END+0.8                    # tenuta, poi dissolvenza
OWN=[1.58,1.72,1.49,1.68,1.43]; PH=[1.12,0.17,0.75,0.69,0.35]; COMMON=1.4; G0=0.3
# rete a due livelli: fine e chiarissima, poi linee principali più marcate con piccole croci in alcuni incroci
fine=''.join(f'<path d="M{x} 0V400"/>' for x in range(10,300,20))+''.join(f'<path d="M0 {y}H300"/>' for y in range(12,400,20))
princ=''.join(f'<path d="M{x} 0V400"/>' for x in (70,150,230))+''.join(f'<path d="M0 {y}H300"/>' for y in (92,172,252,332))
croci=''.join(f'<path d="M{x-3.5} {y}H{x+3.5}M{x} {y-3.5}V{y+3.5}"/>' for x,y in ((150,92),(230,92),(230,252),(70,332),(150,332)))
g=f'<g stroke-opacity=".045">{fine}</g><g stroke-opacity=".13">{princ}</g><g stroke-opacity=".45" stroke-width="1.1">{croci}</g>'
defs=''
for k,p in enumerate(PTS):
    defs+=f'<linearGradient id="{P}g{k}" gradientUnits="userSpaceOnUse" x1="{side(p[0])}" y1="{W[1]}" x2="{p[0]}" y2="{p[1]}"><stop offset=".15" stop-color="{INK}"/><stop offset="1" stop-color="{COLS[k]}"/></linearGradient>'
B.append(f'<rect y="12" width="300" height="360" fill="#fff"/><g mask="url(#{P}vm)" stroke="{INK}">{g}</g>')
for p in PTS: B.append(f'<path d="{curve(p)}" class="att"/>')
# bracci nuovi: partono da KOINEME verso le zone vuote e sfumano senza raggiungere nessun punto
BRACCI=[((140,180),'M140 180 C 140 120, 168 80, 170 -8'),((106,190),'M106 190 C 60 190, 30 206, -14 222'),((140,200),'M140 200 C 140 262, 118 304, 124 390')]
for j,((x0,y0),d) in enumerate(BRACCI):
    x1,y1=[float(v) for v in d.split()[-2:]]
    defs+=f'<linearGradient id="{P}br{j}" gradientUnits="userSpaceOnUse" x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}"><stop offset="0" stop-color="{SOFT}"/><stop offset="1" stop-color="{SOFT}" stop-opacity="0"/></linearGradient>'
    B.append(f'<path d="{d}" stroke="url(#{P}br{j})" class="braccio"/>')
for k,p in enumerate(PTS):
    s=C[k]; a=s+DRAW
    kf(f'l{k}',[('0%','stroke-dashoffset:1;opacity:1'),(s,'stroke-dashoffset:1;opacity:1'),(a,'stroke-dashoffset:0'),(END,'stroke-dashoffset:0;opacity:1'),(RESET,'stroke-dashoffset:0;opacity:0'),('100%','stroke-dashoffset:1;opacity:0')])
    ho=.2 if COLS[k]==INK else .5
    B.append(f'<path d="{curve(p)}" pathLength="1" class="alone" stroke="{COLS[k]}" stroke-opacity="{ho}" filter="url(#{P}sf)" style="{an(f"l{k}")}"/>')
    B.append(f'<path d="{curve(p)}" pathLength="1" class="pieno" stroke="url(#{P}g{k})" style="{an(f"l{k}")}"/>')
# i punti e il loro battito: l'alone respira, ognuno col suo ritmo; collegato, col ritmo comune
for k,(x,y) in enumerate(PTS):
    arr=C[k]+DRAW
    times=[]; t=PH[k]
    while t<arr-0.3: times.append(t); t+=OWN[k]
    t=G0
    while t<max(arr, times[-1]+0.85): t+=COMMON
    while t<RESET-0.5: times.append(t); t+=COMMON
    t=max(RESET+0.1, times[-1]+0.85)
    while t<T-0.75: times.append(t); t+=OWN[k]
    base=.3 if COLS[k]==INK else .55
    fr=[('0%',f'transform:scale(1);opacity:{base}')]
    for t in times: fr+=[(t,f'transform:scale(1);opacity:{base}'),(t+0.22,'transform:scale(1.55);opacity:1'),(t+0.72,f'transform:scale(1);opacity:{base}')]
    fr+=[('100%',f'transform:scale(1);opacity:{base}')]
    kf(f'b{k}',fr)
    B.append(halo(x,y,COLS[k],14,.6 if COLS[k]!=INK else .45,f'transform-box:fill-box;transform-origin:center;{an(f"b{k}","ease-in-out")}'))
    B.append(f'<circle cx="{x}" cy="{y}" r="5.2" fill="{INK}"/>')

# KOINEME: la parola, senza pillola
B.append(f'<text x="{W[0]}" y="{W[1]+4.5}" text-anchor="middle" fill="{INK}" class="pl parola">KOINEME</text>')

html=f'''<!-- KOINEME™ · LA COSTELLAZIONE · blocco per un elemento di codice personalizzato di LearnWorlds. Solo HTML, CSS e SVG, nessuno script. -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo:wght@600&display=swap">
<style>
/* ALLINEAMENTO: cambia il numero qui sotto per spostare l'animazione. Negativo = più su (es. -40px), positivo = più giù (es. 30px). */
.kn-co-w{{--sposta:0px}}
.kn-co-w{{container-type:inline-size;max-width:400px;margin:var(--sposta) auto 0}}
.kn-co{{width:100%;background:#fff}}
.kn-co svg{{display:block;width:100%;height:auto}}
.kn-co text{{font-family:"Exo",system-ui,sans-serif;font-size:10.5px;font-weight:600;letter-spacing:.9px}}
.kn-co .braccio{{fill:none;stroke-width:1.5;stroke-dasharray:3 5;stroke-linecap:round}}
.kn-co .att{{fill:none;stroke:{SOFT};stroke-width:1.5;stroke-dasharray:3 5;stroke-linecap:round}}
.kn-co .alone{{fill:none;stroke-width:9;stroke-linecap:round;stroke-dasharray:1 2;stroke-dashoffset:1}}
.kn-co .pieno{{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-dasharray:1 2;stroke-dashoffset:1}}
.kn-co .parola{{font-size:12.5px;letter-spacing:1.6px}}
/* le scritte restano della stessa misura a ogni larghezza */
.kn-co .pl{{transform-box:fill-box;transform-origin:center;transform:scale(.92)}}
@container (min-width:390px){{.kn-co .pl{{transform:scale(.86)}}}}
{chr(10).join(css)}
@media (prefers-reduced-motion:reduce){{.kn-co *{{animation:none!important}}.kn-co .alone,.kn-co .pieno{{stroke-dashoffset:0}}}}
</style>
<div class="kn-co-w"><figure class="kn-co" role="img" aria-label="Cinque punti di colori diversi, ognuno con il proprio battito, si collegano uno alla volta attraverso la parola KOINEME e finiscono per battere insieme." style="margin:0 auto">
<svg viewBox="0 12 300 360" aria-hidden="true">
<defs><radialGradient id="{P}vg"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="{P}vm"><rect y="12" width="300" height="360" fill="url(#{P}vg)"/></mask>
<filter id="{P}sf" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>{defs}</defs>
{chr(10).join(B)}
</svg></figure></div>
'''
open(os.path.join(OUT,'costellazione-embed.html'),'w').write(html)
open(os.path.join(OUT,'costellazione-codice.txt'),'w').write(html)
open(os.path.join(OUT,'anteprima.html'),'w').write('<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KOINEME · la costellazione</title><style>body{margin:0;padding:32px 16px;background:#fff}</style></head><body>'+html+'</body></html>')
open(os.path.join(OUT,'costellazione-verticale.html'),'w').write('<!doctype html><html lang="it"><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}body{width:1080px;height:1296px}body .kn-co-w{width:1080px;max-width:none}</style></head><body>'+html+'</body></html>')
print('ok',round(END,1),round(RESET,1))
