/* Bacteria plana — imagen del modelo con zoom (rueda/pellizco) + arrastre + zonas tocables */
(function(){
"use strict";
/* Zonas tocables en % de la imagen (x,y,r). Varias por parte donde corresponde. */
const ZONES=[
 {p:"capsula",x:26,y:52,r:9},
 {p:"pared",x:52,y:44,r:7},{p:"pared",x:78,y:47,r:6},
 {p:"membrana",x:75,y:67,r:6},{p:"membrana",x:45,y:69,r:6},
 {p:"citoplasma",x:46,y:55,r:10},{p:"citoplasma",x:72,y:56,r:9},
 {p:"adn",x:38,y:55,r:5.5},{p:"adn",x:52,y:52,r:5.5},{p:"adn",x:63,y:55,r:5.5},
 {p:"ribosomas",x:44,y:63,r:5},{p:"ribosomas",x:70,y:60,r:5},{p:"ribosomas",x:52,y:45,r:5},
 {p:"plasmido",x:68.5,y:63,r:4},
 {p:"pili",x:30,y:36,r:7},{p:"pili",x:50,y:32,r:7},{p:"pili",x:72,y:34,r:7},
 {p:"pili",x:28,y:73,r:7},{p:"pili",x:55,y:75,r:7},{p:"pili",x:78,y:70,r:7},{p:"pili",x:14,y:56,r:8},
 {p:"flagelo",x:45,y:17,r:8},{p:"flagelo",x:87,y:37,r:8},{p:"flagelo",x:78,y:50,r:6},{p:"flagelo",x:16,y:23,r:7}
];
const ANCHOR={capsula:[26,52],pared:[52,44],membrana:[75,67],citoplasma:[46,55],
 adn:[52,52],ribosomas:[44,63],plasmido:[68.5,63],pili:[50,32],flagelo:[45,17]};

function initBacteriaZoom(host,onPick){
  const box=document.createElement("div"); box.className="baczoom"; host.appendChild(box);
  const mv=document.createElement("div"); mv.className="bzmove"; box.appendChild(mv);
  const img=document.createElement("img"); img.src="assets/img/bacteria-modelo.webp";
  img.alt="Modelo de célula procariota en corte"; img.draggable=false; mv.appendChild(img);
  ZONES.forEach(z=>{ const h=document.createElement("div"); h.className="hotz"; h.dataset.part=z.p;
    h.style.left=z.x+"%"; h.style.top=z.y+"%"; h.style.width=(z.r*2)+"%"; mv.appendChild(h); });

  /* Pan & zoom: arranca ajustada entera dentro del visor */
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
  box.addEventListener("pointerdown",e=>{ drag={x:e.clientX,y:e.clientY,tx,ty,moved:false}; box.setPointerCapture(e.pointerId); });
  box.addEventListener("pointermove",e=>{ if(!drag)return;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8) drag.moved=true;
    tx=drag.tx+e.clientX-drag.x; ty=drag.ty+e.clientY-drag.y; clamp(); apply(); });
  box.addEventListener("pointerup",e=>{
    const wasDrag=drag&&drag.moved; drag=null; if(wasDrag) return;
    const r=mv.getBoundingClientRect();
    const ix=(e.clientX-r.left)/r.width*1536, iy=(e.clientY-r.top)/r.height*1024;
    let best=null,bd=1e9;
    ZONES.forEach(z=>{ const zx=z.x*15.36, zy=z.y*10.24, rr=z.r*15.36;
      const dd=Math.hypot(ix-zx,iy-zy); if(dd<rr&&dd<bd){bd=dd;best=z;} });
    if(best) onPick(best.p);
  });
  box.addEventListener("pointercancel",()=>{drag=null;});
  box.addEventListener("dblclick",()=>{ fit(); });
  /* Pinch: dos dedos */
  const tchs={};
  box.addEventListener("touchstart",e=>{ for(const t of e.changedTouches) tchs[t.identifier]={x:t.clientX,y:t.clientY}; },{passive:true});
  box.addEventListener("touchmove",e=>{ const ids=Object.keys(tchs); if(ids.length<2)return; e.preventDefault();
    const [a,b]=ids; const p0={a:tchs[a],b:tchs[b]},p1={a:{x:e.touches[0].clientX,y:e.touches[0].clientY},b:{x:e.touches[1].clientX,y:e.touches[1].clientY}};
    const d0=Math.hypot(p0.a.x-p0.b.x,p0.a.y-p0.b.y), d1=Math.hypot(p1.a.x-p1.b.x,p1.a.y-p1.b.y);
    if(d0>0){ const k=d1/d0, r=box.getBoundingClientRect(),mx=(p1.a.x+p1.b.x)/2-r.left,my=(p1.a.y+p1.b.y)/2-r.top;
      tx=mx-(mx-tx)*k; ty=my-(my-ty)*k; s*=k; clamp(); apply(); }
    tchs[a]=p1.a; tchs[b]=p1.b; },{passive:false});
  box.addEventListener("touchend",e=>{ for(const t of e.changedTouches) delete tchs[t.identifier]; },{passive:true});

  /* Etiquetas + halo al encontrar */
  const lbls={};
  function setFound(list){
    Object.keys(ANCHOR).forEach(k=>{
      const on=list.includes(k);
      mv.querySelectorAll(`.hotz[data-part="${k}"]`).forEach(h=>h.classList.toggle("on",on));
      if(!lbls[k]){ const e=document.createElement("div"); e.className="zlbl"; mv.appendChild(e); lbls[k]=e;
        e.style.left=ANCHOR[k][0]+"%"; e.style.top=ANCHOR[k][1]+"%"; }
      lbls[k].textContent=on?PART_NAME[k]:""; lbls[k].style.display=on?"block":"none";
    });
  }
  fit();
  return {setFound};
}
window.initBacteriaZoom=initBacteriaZoom;
})();
