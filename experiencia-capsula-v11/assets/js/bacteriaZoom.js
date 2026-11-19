/* Bacteria plana — imagen del modelo con zoom (rueda/pellizco) + arrastre + zonas tocables.
   La envoltura (cápsula, pared, membrana) se detecta por el contorno real de la célula, no por círculos:
   un toque en el borde se resuelve a favor de la capa que pide el obstáculo actual. */
(function(){
"use strict";
/* Contorno de la célula medido en la imagen (1536 x 1024 px): una columna cada 8 px desde x = 536. */
const X0=536, DX=8;
const TOP=[438,439,439,440,439,438,438,436,435,434,432,431,431,430,430,430,430,430,429,428,427,427,426,426,427,428,430,431,433,434,436,438,440,441,443,444,445,445,444,444,442,440,439,436,434,433,431,430,428,428,427,428,428,428,429,429,430,430,430,430,430,430,431,431,432,433,434,435,436,437,440,442,445,449,453,460,466,475,487,505];
const BOT=[706,705,704,703,702,702,702,702,703,704,704,704,704,704,704,704,704,704,704,704,704,704,704,703,702,703,702,703,704,705,706,707,707,708,707,707,707,707,708,708,708,708,708,708,708,709,710,711,713,714,715,716,717,717,717,717,716,715,714,711,709,706,703,701,699,696,694,691,690,687,685,682,679,676,672,667,660,654,646,634];
const XEND=1190;                       /* extremo derecho de la célula */
const CAP={cx:528,cy:572,rx:190,ry:142}; /* casquete azul del extremo izquierdo (cápsula) */
/* Piezas internas: círculos en px de imagen */
const INNER=[
 {p:"plasmido",x:1052,y:626,r:34},
 {p:"adn",x:590,y:565,r:70},{p:"adn",x:770,y:560,r:75},{p:"adn",x:915,y:580,r:65},{p:"adn",x:995,y:540,r:55},
 {p:"ribosomas",x:650,y:665,r:28},{p:"ribosomas",x:850,y:480,r:28},{p:"ribosomas",x:1100,y:560,r:30},{p:"ribosomas",x:960,y:670,r:28}];
/* Flagelo: puntos a lo largo del filamento */
const FLAG=[[1185,545],[1250,520],[1330,470],[1400,400],[1420,320],[1390,265],[1300,235],[1150,195],[1000,150],[850,125],[700,160],[560,205],[400,225],[240,245]];
/* Marcas visuales (en %) para el halo de pista y las etiquetas */
const MARKS={
 pared:[[42,42.6,3],[62,42.2,3],[74,43.6,3],[62,69.2,3]],
 capsula:[[27,56,7]],
 flagelo:[[90,31,4],[55,12.5,4]],
 pili:[[33,35,5],[62,36,5],[70,75,5]],
 plasmido:[[68.5,61.2,3]],
 membrana:[[60,67.4,2.5]],citoplasma:[[46,60,4]],adn:[[52,54,4]],ribosomas:[[42,65,2.5]]};
const ANCHOR={capsula:[26,52],pared:[62,42.4],membrana:[60,66.2],citoplasma:[44,61],
 adn:[52,54],ribosomas:[42,65],plasmido:[68.5,61],pili:[50,33],flagelo:[55,12.5]};

function edges(ix){
  if(ix<X0||ix>XEND+12) return null;
  const i=Math.max(0,Math.min(TOP.length-1,Math.round((ix-X0)/DX)));
  return {t:TOP[i],b:BOT[i]};
}
/* Profundidad desde el borde (px): positiva dentro de la célula, negativa fuera */
function depth(ix,iy){
  const e=edges(ix); if(!e) return null;
  let d=Math.min(iy-e.t,e.b-iy);
  if(ix>1080) d=Math.min(d,XEND-ix);
  return d;
}
function classify(ix,iy,target){
  const ce=((ix-CAP.cx)/CAP.rx)**2+((iy-CAP.cy)/CAP.ry)**2;
  if(ce<=1 && ix<CAP.cx+4) return (target==="pili"&&ce>0.55)?"pili":"capsula";
  const d=depth(ix,iy);
  if(d!==null && d>=-18 && d<=36){                 /* envoltura */
    if(target==="pared"||target==="capsula"||target==="membrana") return target;
    return d<8?"capsula":d<26?"pared":"membrana";
  }
  if(d!==null && d>36){                             /* interior */
    let best=null,bd=1e9;
    INNER.forEach(z=>{ const dd=Math.hypot(ix-z.x,iy-z.y); if(dd<z.r&&dd<bd){bd=dd;best=z;} });
    return best?best.p:"citoplasma";
  }
  /* fuera de la célula */
  if(FLAG.some(([x,y])=>Math.hypot(ix-x,iy-y)<46)) return "flagelo";
  const near=(d!==null && d>-190) ||
    ((ix-CAP.cx)/(CAP.rx+170))**2+((iy-CAP.cy)/(CAP.ry+170))**2<=1 ||
    (ix>XEND-40 && ix<XEND+200 && iy>420 && iy<760);
  return near?"pili":null;
}

function initBacteriaZoom(host,onPick,getTarget){
  const box=document.createElement("div"); box.className="baczoom"; host.appendChild(box);
  const mv=document.createElement("div"); mv.className="bzmove"; box.appendChild(mv);
  const img=document.createElement("img"); img.src="assets/img/bacteria-modelo.webp";
  img.alt="Modelo de célula procariota en corte"; img.draggable=false; mv.appendChild(img);
  Object.entries(MARKS).forEach(([p,list])=>list.forEach(([x,y,r])=>{ const h=document.createElement("div"); h.className="hotz"; h.dataset.part=p;
    h.style.left=x+"%"; h.style.top=y+"%"; h.style.width=(r*2)+"%"; mv.appendChild(h); }));

  const RATIO=1024/1536;
  let s=1,tx=0,ty=0;
  const dims=()=>{ const bw=box.clientWidth,bh=box.clientHeight; return {bw,bh,iw:bw,ih:bw*RATIO}; };
  const s0=()=>{ const d=dims(); return Math.min(1,d.bh/d.ih); };
  const fit=()=>{ const d=dims(); s=s0(); tx=(d.bw-d.iw*s)/2; ty=(d.bh-d.ih*s)/2; apply(); };
  const clamp=()=>{ const d=dims(); s=Math.min(4,Math.max(s0(),s));
    const w=d.iw*s,h=d.ih*s;
    tx=w<=d.bw?(d.bw-w)/2:Math.min(0,Math.max(d.bw-w,tx));
    ty=h<=d.bh?(d.bh-h)/2:Math.min(0,Math.max(d.bh-h,ty)); };
  const apply=()=>{ mv.style.transform=`translate(${tx}px,${ty}px) scale(${s})`; };
  box.addEventListener("wheel",e=>{ e.preventDefault();
    const r=box.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    const ns=s*(e.deltaY<0?1.18:1/1.18), k=Math.min(4,Math.max(s0(),ns))/s;
    tx=mx-(mx-tx)*k; ty=my-(my-ty)*k; s*=k; clamp(); apply(); },{passive:false});
  let drag=null;
  box.addEventListener("pointerdown",e=>{ drag={x:e.clientX,y:e.clientY,tx,ty,moved:false}; try{box.setPointerCapture(e.pointerId);}catch(_){}} );
  box.addEventListener("pointermove",e=>{ if(!drag)return;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8) drag.moved=true;
    tx=drag.tx+e.clientX-drag.x; ty=drag.ty+e.clientY-drag.y; clamp(); apply(); });
  box.addEventListener("pointerup",e=>{
    const wasDrag=drag&&drag.moved; drag=null; if(wasDrag) return;
    const r=mv.getBoundingClientRect();
    const ix=(e.clientX-r.left)/r.width*1536, iy=(e.clientY-r.top)/r.height*1024;
    const p=classify(ix,iy,getTarget?getTarget():null);
    if(p) onPick(p);
  });
  box.addEventListener("pointercancel",()=>{drag=null;});
  box.addEventListener("dblclick",()=>{ fit(); });
  const tchs={};
  box.addEventListener("touchstart",e=>{ for(const t of e.changedTouches) tchs[t.identifier]={x:t.clientX,y:t.clientY}; },{passive:true});
  box.addEventListener("touchmove",e=>{ const ids=Object.keys(tchs); if(ids.length<2)return; e.preventDefault();
    const [a,b]=ids; const p0={a:tchs[a],b:tchs[b]},p1={a:{x:e.touches[0].clientX,y:e.touches[0].clientY},b:{x:e.touches[1].clientX,y:e.touches[1].clientY}};
    const d0=Math.hypot(p0.a.x-p0.b.x,p0.a.y-p0.b.y), d1=Math.hypot(p1.a.x-p1.b.x,p1.a.y-p1.b.y);
    if(d0>0){ const k=d1/d0, r=box.getBoundingClientRect(),mx=(p1.a.x+p1.b.x)/2-r.left,my=(p1.a.y+p1.b.y)/2-r.top;
      tx=mx-(mx-tx)*k; ty=my-(my-ty)*k; s*=k; clamp(); apply(); }
    tchs[a]=p1.a; tchs[b]=p1.b; },{passive:false});
  box.addEventListener("touchend",e=>{ for(const t of e.changedTouches) delete tchs[t.identifier]; },{passive:true});

  const lbls={};
  function setFound(list){
    Object.keys(ANCHOR).forEach(k=>{
      const on=list.includes(k);
      if(!lbls[k]){ const e=document.createElement("div"); e.className="zlbl"; mv.appendChild(e); lbls[k]=e;
        e.style.left=ANCHOR[k][0]+"%"; e.style.top=ANCHOR[k][1]+"%"; }
      lbls[k].textContent=on?PART_NAME[k]:""; lbls[k].style.display=on?"block":"none";
    });
  }
  function hint(p){ mv.querySelectorAll(".hotz").forEach(h=>h.classList.toggle("on",!!p&&h.dataset.part===p)); }
  /* Ajuste inicial cuando el visor ya tiene tamaño real (puede crearse antes de que el paso se dibuje) */
  let userMoved=false;
  box.addEventListener("wheel",()=>{userMoved=true;},{passive:true});
  box.addEventListener("pointermove",()=>{ if(drag&&drag.moved) userMoved=true; });
  const safeFit=()=>{ if(box.clientWidth>0&&box.clientHeight>0&&!userMoved) fit(); };
  safeFit(); requestAnimationFrame(safeFit); img.addEventListener("load",safeFit);
  if(window.ResizeObserver) new ResizeObserver(safeFit).observe(box);
  return {setFound,hint,classify};
}
window.initBacteriaZoom=initBacteriaZoom;
})();
