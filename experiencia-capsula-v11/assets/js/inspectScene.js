/* Visor panorámico reutilizable (Operativo Bromatología).
   Imagen plana 1536x1024 con zoom (rueda/pellizco), arrastre y zonas tocables en %.
   initPano(host, imgSrc, zones, onPick) → {mark(id,cls,txt), dot(ix,iy,cls), reset()}
   zones: [{id,x,y,r}] en porcentajes de imagen. onPick(zone|null, ix, iy). */
(function(){
window.initPano=function(host,imgSrc,zones,onPick){
  const box=document.createElement("div"); box.className="baczoom"; host.appendChild(box);
  const mv=document.createElement("div"); mv.className="bzmove"; box.appendChild(mv);
  const img=document.createElement("img"); img.src=imgSrc; img.alt="Escena del operativo"; img.draggable=false; mv.appendChild(img);
  const RATIO=1024/1536;
  let s=1,tx=0,ty=0;
  const dims=()=>{ const bw=box.clientWidth,bh=box.clientHeight; return {bw,bh,iw:bw,ih:bw*RATIO}; };
  const s0=()=>1; /* cubre todo el ancho; se recorre de arriba a abajo */
  const apply=()=>{ mv.style.transform=`translate(${tx}px,${ty}px) scale(${s})`; };
  const fit=()=>{ const d=dims(); s=1; tx=0; ty=(d.bh-d.ih)/2; apply(); };
  const clamp=()=>{ const d=dims(); s=Math.min(4,Math.max(s0(),s));
    const w=d.iw*s,h=d.ih*s;
    tx=w<=d.bw?(d.bw-w)/2:Math.min(0,Math.max(d.bw-w,tx));
    ty=h<=d.bh?(d.bh-h)/2:Math.min(0,Math.max(d.bh-h,ty)); };
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
    const ix=(e.clientX-r.left)/r.width*100, iy=(e.clientY-r.top)/r.height*100;
    if(ix<0||ix>100||iy<0||iy>100) return;
    let best=null,bd=1e9;
    zones.forEach(z=>{ const dd=Math.hypot(ix-z.x,iy-z.y); if(dd<z.r&&dd<bd){bd=dd;best=z;} });
    onPick(best,ix,iy);
  });
  box.addEventListener("pointercancel",()=>{drag=null;});
  box.addEventListener("dblclick",()=>{ fit(); });
  const tchs={};
  box.addEventListener("touchstart",e=>{ for(const t of e.changedTouches) tchs[t.identifier]={x:t.clientX,y:t.clientY}; },{passive:true});
  box.addEventListener("touchmove",e=>{ const ids=Object.keys(tchs); if(ids.length<2)return; e.preventDefault();
    const [a,b]=ids; const p1={a:{x:e.touches[0].clientX,y:e.touches[0].clientY},b:{x:e.touches[1].clientX,y:e.touches[1].clientY}};
    const d0=Math.hypot(tchs[a].x-tchs[b].x,tchs[a].y-tchs[b].y), d1=Math.hypot(p1.a.x-p1.b.x,p1.a.y-p1.b.y);
    if(d0>0){ const k=d1/d0, r=box.getBoundingClientRect(),mx=(p1.a.x+p1.b.x)/2-r.left,my=(p1.a.y+p1.b.y)/2-r.top;
      tx=mx-(mx-tx)*k; ty=my-(my-ty)*k; s*=k; clamp(); apply(); }
    tchs[a]=p1.a; tchs[b]=p1.b; },{passive:false});
  box.addEventListener("touchend",e=>{ for(const t of e.changedTouches) delete tchs[t.identifier]; },{passive:true});
  /* Ajuste inicial cuando el visor ya tiene tamaño real (puede crearse antes de que el paso se dibuje) */
  let userMoved=false;
  box.addEventListener("wheel",()=>{userMoved=true;},{passive:true});
  box.addEventListener("pointermove",()=>{ if(drag&&drag.moved) userMoved=true; });
  const safeFit=()=>{ if(box.clientWidth>0&&box.clientHeight>0&&!userMoved) fit(); };
  safeFit(); requestAnimationFrame(safeFit); img.addEventListener("load",safeFit);
  if(window.ResizeObserver) new ResizeObserver(safeFit).observe(box);
  return {
    mark(id,cls,txt){ const z=zones.find(z=>z.id===id); if(!z) return;
      const m=document.createElement("div"); m.className="opmark "+cls;
      m.style.left=z.x+"%"; m.style.top=z.y+"%"; m.style.width=(z.r*2)+"%";
      m.innerHTML=txt?`<span>${txt}</span>`:""; mv.appendChild(m); },
    dot(ix,iy,cls){ const d=document.createElement("div"); d.className="opdot "+cls;
      d.style.left=ix+"%"; d.style.top=iy+"%"; mv.appendChild(d); setTimeout(()=>d.remove(),900); },
    clear(){ mv.querySelectorAll(".opmark,.opdot").forEach(e=>e.remove()); },
    reset(){ this.clear(); fit(); }
  };
};
})();
