/* ════════════════════════════════════════════════════════════════
   MAPA PORTUGAL — Sobre Nós | v44.28 optimizado
   Estratégia de performance:
   · Lazy load de districts.js só quando secção entra no viewport
   · Cache do mapa base num OffscreenCanvas — não re-desenha a cada frame
   · shadowBlur=0 em mobile
   · RAF pausado fora do viewport e com visibilitychange
════════════════════════════════════════════════════════════════ */
(function(){
  var canvas = document.getElementById('sobreMapCanvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var IS_MOBILE = window.innerWidth < 768;
  var DPR = Math.min(window.devicePixelRatio||1, IS_MOBILE ? 1.5 : 2);
  var W, H;

  /* Cache do mapa base (estático) — renderizado 1× */
  var mapCache = null, mapCacheW = 0, mapCacheH = 0;
  var islandCache = null;

  var CITIES = [
    { name:'Porto',            x:0.2668, y:0.1919, r:4.0, hub:true,  source:false },
    { name:'Braga',            x:0.3277, y:0.1173, r:2.8, hub:false, source:false },
    { name:'Viana do Castelo', x:0.2057, y:0.0887, r:2.2, hub:false, source:false },
    { name:'Vila Real',        x:0.5328, y:0.1652, r:2.0, hub:false, source:false },
    { name:'Bragança',         x:0.8282, y:0.067,  r:2.0, hub:false, source:false },
    { name:'Guimarães',        x:0.3665, y:0.1375, r:2.4, hub:false, source:false },
    { name:'Aveiro',           x:0.2595, y:0.2915, r:2.4, hub:false, source:false },
    { name:'Coimbra',          x:0.3268, y:0.3753, r:3.0, hub:false, source:false },
    { name:'Viseu',            x:0.4836, y:0.2884, r:2.0, hub:false, source:false },
    { name:'Guarda',           x:0.6758, y:0.3116, r:2.0, hub:false, source:false },
    { name:'Leiria',           x:0.2132, y:0.4643, r:2.2, hub:false, source:false },
    { name:'Castelo Branco',   x:0.6083, y:0.449,  r:2.0, hub:false, source:false },
    { name:'Lisboa',           x:0.1135, y:0.662,  r:6.0, hub:true,  source:true  },
    { name:'Santarém',         x:0.2492, y:0.5619, r:2.0, hub:false, source:false },
    { name:'Portalegre',       x:0.6276, y:0.55,   r:2.0, hub:false, source:false },
    { name:'Évora',            x:0.483,  y:0.6901, r:2.4, hub:false, source:false },
    { name:'Setúbal',          x:0.1873, y:0.6991, r:2.6, hub:false, source:false },
    { name:'Beja',             x:0.4971, y:0.7971, r:2.0, hub:false, source:false },
    { name:'Faro',             x:0.4765, y:0.9889, r:3.0, hub:false, source:false },
    { name:'Portimão',         x:0.2943, y:0.9665, r:2.0, hub:false, source:false },
    { name:'Tavira',           x:0.5617, y:0.9679, r:1.8, hub:false, source:false },
    { name:'Fátima',           x:0.2850, y:0.5080, r:2.2, hub:false, source:false },
    { name:'Ponta Delgada', x:0, y:0, r:2.4, island:true, slot:'az' },
    { name:'Funchal',       x:0, y:0, r:2.4, island:true, slot:'ma' },
  ];

  var CONNS = [
    [12,0],[12,7],[12,13],[12,16],[12,15],[12,10],[12,14],
    [12,17],[12,18],[12,19],[12,20],[12,21],[12,22],[12,23],
    [0,1],[0,2],[0,5],[0,6],[1,5],[5,3],[3,4],
    [6,7],[7,8],[8,9],[9,11],[7,10],[10,13],[10,21],
    [15,16],[16,17],[17,18],[18,19],[18,20],[14,15],[15,17],[11,14],[13,21],
  ];

  /* ── Resize ── */
  function resize(){
    var cont = canvas.parentElement;
    W = cont.offsetWidth || 380;
    H = Math.round(W * 1.10);
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    mapCache = null; /* invalidar cache ao resize */
    islandCache = null;
  }

  function layout(){
    var ic=W*0.26, cc=W-ic, pad=cc*0.04;
    var mH=H-pad*2, mW=mH*0.641;
    if(mW>cc-pad*2){mW=cc-pad*2;mH=mW/0.641;}
    var oX=ic+(cc-mW)*0.5, oY=(H-mH)*0.5;
    return {ic:ic,oX:oX,oY:oY,mW:mW,mH:mH};
  }

  function tp(mx,my,lo){ return {x:lo.oX+mx*lo.mW,y:lo.oY+my*lo.mH}; }

  /* ── Cache do mapa base ── */
  function buildMapCache(lo){
    if(!window.DISTRICTS||!DISTRICTS.length) return null;
    var oc = document.createElement('canvas');
    oc.width = W * DPR; oc.height = H * DPR;
    var oc_ctx = oc.getContext('2d');
    oc_ctx.setTransform(DPR,0,0,DPR,0,0);

    function drawRing(ring){
      if(!ring||ring.length<2) return;
      var p=tp(ring[0][0],ring[0][1],lo); oc_ctx.moveTo(p.x,p.y);
      for(var i=1;i<ring.length;i++){var q=tp(ring[i][0],ring[i][1],lo);oc_ctx.lineTo(q.x,q.y);}
      oc_ctx.closePath();
    }

    /* fill subtil */
    oc_ctx.fillStyle='rgba(45,91,227,0.05)'; oc_ctx.shadowBlur=0;
    DISTRICTS.forEach(function(d){d.polys.forEach(function(p){oc_ctx.beginPath();drawRing(p[0]);oc_ctx.fill();});});

    /* fronteiras internas */
    oc_ctx.strokeStyle='rgba(45,91,227,0.15)'; oc_ctx.lineWidth=0.6; oc_ctx.lineJoin='round'; oc_ctx.shadowBlur=0;
    DISTRICTS.forEach(function(d){d.polys.forEach(function(p){p.forEach(function(r){oc_ctx.beginPath();drawRing(r);oc_ctx.stroke();});});});

    if(!IS_MOBILE){
      /* glow exterior — só desktop */
      oc_ctx.shadowColor='rgba(45,91,227,0.7)'; oc_ctx.shadowBlur=20;
      oc_ctx.strokeStyle='rgba(60,100,220,0.28)'; oc_ctx.lineWidth=6;
      DISTRICTS.forEach(function(d){d.polys.forEach(function(p){oc_ctx.beginPath();drawRing(p[0]);oc_ctx.stroke();});});
      oc_ctx.shadowBlur=0;
    }

    /* linha exterior nítida */
    oc_ctx.shadowColor=IS_MOBILE?'transparent':'rgba(80,130,255,0.8)';
    oc_ctx.shadowBlur=IS_MOBILE?0:6;
    oc_ctx.strokeStyle='rgba(45,91,227,0.90)'; oc_ctx.lineWidth=IS_MOBILE?1.0:1.4;
    DISTRICTS.forEach(function(d){d.polys.forEach(function(p){oc_ctx.beginPath();drawRing(p[0]);oc_ctx.stroke();});});

    return oc;
  }

  /* ── Ilhas ── */
  function drawIslands(lo, alpha){
    if(!window.ACORES_ISLANDS||!window.MADEIRA_ISLANDS) return {};
    var ic=lo.ic;
    var azW=ic*0.88, azH=azW*0.52, azX=(ic-azW)*0.5, azY=lo.oY+lo.mH*0.06;
    var maW=ic*0.82, maH=maW*1.60, maX=(ic-maW)*0.5, maY=lo.oY+lo.mH*0.82;
    var funchalX=maX+maW*0.59, funchalY=maY+maH*0.081;
    var pdX=azX+azW*0.64, pdY=azY+azH*0.65;

    function drawSet(islands,ax,ay,aw,ah){
      islands.forEach(function(isl){
        isl.polys.forEach(function(poly,pi){
          poly.forEach(function(ring,ri){
            if(ring.length<2) return;
            ctx.beginPath();
            ctx.moveTo(ax+ring[0][0]*aw,ay+ring[0][1]*ah);
            for(var i=1;i<ring.length;i++) ctx.lineTo(ax+ring[i][0]*aw,ay+ring[i][1]*ah);
            ctx.closePath();
            if(ri===0&&pi===0){ctx.save();ctx.fillStyle='rgba(45,91,227,0.05)';ctx.globalAlpha=alpha;ctx.shadowBlur=0;ctx.fill();ctx.restore();}
            ctx.save();
            if(!IS_MOBILE){ctx.globalAlpha=alpha*0.25;ctx.strokeStyle='rgba(45,91,227,0.30)';ctx.shadowColor='rgba(45,91,227,0.4)';ctx.shadowBlur=10;ctx.lineWidth=3;ctx.stroke();}
            ctx.globalAlpha=alpha*0.95;ctx.strokeStyle='rgba(45,91,227,0.85)';ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.lineWidth=1.0;ctx.stroke();
            ctx.restore();
          });
        });
      });
    }

    ctx.save();
    drawSet(ACORES_ISLANDS,azX,azY,azW,azH);
    drawSet(MADEIRA_ISLANDS,maX,maY,maW,maH);
    ctx.font='600 8.5px Montserrat,sans-serif';ctx.textAlign='center';
    ctx.shadowColor='rgba(0,10,30,0.9)';ctx.shadowBlur=3;
    ctx.fillStyle='rgba(45,91,227,0.65)';ctx.globalAlpha=alpha;
    ctx.fillText('Açores',ic*0.5,azY-5);
    ctx.fillText('Madeira',ic*0.5,maY-5);
    ctx.restore();

    var lpos=tp(CITIES[12].x,CITIES[12].y,lo);
    [[pdX,pdY],[funchalX,funchalY]].forEach(function(pt){
      ctx.save();ctx.globalAlpha=alpha*0.40;ctx.setLineDash([5,6]);
      ctx.strokeStyle='rgba(45,91,227,0.45)';ctx.shadowBlur=0;ctx.lineWidth=0.8;
      ctx.beginPath();ctx.moveTo(pt[0],pt[1]);
      ctx.quadraticCurveTo((pt[0]+lpos.x)*0.42,(pt[1]+lpos.y)*0.5,lpos.x,lpos.y);
      ctx.stroke();ctx.setLineDash([]);ctx.restore();
    });
    return {az:{x:pdX,y:pdY},ma:{x:funchalX,y:funchalY}};
  }

  /* ── Efeito chegada ── */
  var arrivals=[];
  function triggerArrival(x,y,maxR){arrivals.push({x:x,y:y,r:0,maxR:maxR||10,alpha:0.9,speed:0.5});}
  function updateArrivals(){for(var i=arrivals.length-1;i>=0;i--){var a=arrivals[i];a.r+=a.speed;a.alpha=0.9*(1-a.r/a.maxR);if(a.r>=a.maxR)arrivals.splice(i,1);}}
  function drawArrivals(){
    arrivals.forEach(function(a){
      ctx.save();ctx.globalAlpha=a.alpha*0.75;
      ctx.strokeStyle='rgba(80,130,255,0.85)';ctx.shadowBlur=0;ctx.lineWidth=1.0;
      ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.stroke();ctx.restore();
    });
  }

  /* ── Partículas ── */
  var particles=[];
  function initParticles(islandPos){
    particles=[];
    CONNS.forEach(function(conn){
      var a=CITIES[conn[0]],b=CITIES[conn[1]]; if(!a||!b) return;
      var numP=IS_MOBILE?1:((conn[0]===12||conn[1]===12)?3:2);
      for(var k=0;k<numP;k++){
        particles.push({a:conn[0],b:conn[1],t:k/numP,speed:0.006+Math.random()*0.008});
      }
    });
  }

  /* ── Rede animada ── */
  function drawNetwork(lo,prog,ts,islandPos){
    var lpos=tp(CITIES[12].x,CITIES[12].y,lo);

    /* Linhas — só desktop */
    if(!IS_MOBILE){
      CONNS.forEach(function(conn){
        var a=CITIES[conn[0]],b=CITIES[conn[1]]; if(!a||!b) return;
        var ap=a.island?islandPos[a.slot]:tp(a.x,a.y,lo);
        var bp=b.island?islandPos[b.slot]:tp(b.x,b.y,lo);
        if(!ap||!bp) return;
        ctx.save();ctx.globalAlpha=prog*0.30;
        ctx.strokeStyle='rgba(45,91,227,0.55)';ctx.shadowBlur=0;ctx.lineWidth=0.65;
        ctx.beginPath();ctx.moveTo(ap.x,ap.y);ctx.lineTo(bp.x,bp.y);ctx.stroke();ctx.restore();
      });
    }

    /* Partículas */
    particles.forEach(function(p){
      var prev=p.t; p.t=(p.t+p.speed)%1;
      var a=CITIES[p.a],b=CITIES[p.b]; if(!a||!b) return;
      var ap=a.island?islandPos[a.slot]:tp(a.x,a.y,lo);
      var bp=b.island?islandPos[b.slot]:tp(b.x,b.y,lo);
      if(!ap||!bp) return;
      var px=ap.x+(bp.x-ap.x)*p.t, py=ap.y+(bp.y-ap.y)*p.t;
      if(prev>0.92&&p.t<0.15) triggerArrival(bp.x,bp.y,b.hub?16:8);
      ctx.save();ctx.globalAlpha=prog*0.90;
      ctx.fillStyle='rgba(180,210,255,0.95)';
      ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(px,py,IS_MOBILE?1.0:1.5,0,Math.PI*2);ctx.fill();ctx.restore();
    });

    updateArrivals(); drawArrivals();

    /* Halo Lisboa — simplificado */
    var pulse=1+0.20*Math.sin(ts*0.0025);
    var grad=ctx.createRadialGradient(lpos.x,lpos.y,0,lpos.x,lpos.y,CITIES[12].r*4*pulse);
    grad.addColorStop(0,'rgba(45,91,227,0.28)');
    grad.addColorStop(1,'rgba(45,91,227,0)');
    ctx.globalAlpha=prog;ctx.fillStyle=grad;
    ctx.beginPath();ctx.arc(lpos.x,lpos.y,CITIES[12].r*4*pulse,0,Math.PI*2);ctx.fill();

    /* Cidades */
    CITIES.forEach(function(c){
      if(c.island) return;
      var pos=tp(c.x,c.y,lo);
      ctx.save();ctx.globalAlpha=prog;
      ctx.shadowBlur=0;
      ctx.fillStyle=c.source?'#5B82F5':(c.hub?'rgba(45,91,227,0.95)':'rgba(45,91,227,0.75)');
      ctx.beginPath();ctx.arc(pos.x,pos.y,c.r,0,Math.PI*2);ctx.fill();
      if(c.source){ctx.fillStyle='#FAFBFD';ctx.beginPath();ctx.arc(pos.x,pos.y,c.r*0.42,0,Math.PI*2);ctx.fill();}
      ctx.restore();
      if(c.r>=1.8){
        ctx.save();ctx.globalAlpha=prog*0.85;
        ctx.font=(c.source?'700 11px':'500 8px')+' Montserrat,sans-serif';
        ctx.fillStyle=c.source?'rgba(10,20,60,0.90)':'rgba(20,40,120,0.80)';
        ctx.shadowColor='rgba(255,255,255,0.9)';ctx.shadowBlur=3;ctx.textAlign='left';
        ctx.fillText(c.name,pos.x+c.r+3,pos.y+3.5);ctx.restore();
      }
    });

    /* Marcadores ilhas */
    [{slot:'az'},{slot:'ma'}].forEach(function(info){
      var ipos=islandPos[info.slot]; if(!ipos) return;
      ctx.save();ctx.globalAlpha=prog;ctx.shadowBlur=0;
      ctx.fillStyle='rgba(45,91,227,0.85)';
      ctx.beginPath();ctx.arc(ipos.x,ipos.y,2.2,0,Math.PI*2);ctx.fill();ctx.restore();
    });
  }

  /* ── Loop principal ── */
  var rafId=null, running=false, startT=null;

  function loop(ts){
    if(!running) return;
    if(!startT) startT=ts;
    var prog=Math.min((ts-startT)/2000,1);
    var lo=layout();

    ctx.clearRect(0,0,W,H);
    /* Fundo */
    ctx.fillStyle='#FAFBFD';
    ctx.beginPath();
    if(ctx.roundRect){ctx.roundRect(0,0,W,H,12);}else{ctx.rect(0,0,W,H);}
    ctx.fill();

    /* Mapa base — do cache */
    if(!mapCache || mapCacheW!==W){
      mapCache=buildMapCache(lo);
      mapCacheW=W; mapCacheH=H;
    }
    if(mapCache) ctx.drawImage(mapCache,0,0,W,H);

    var islandPos=drawIslands(lo,Math.min(prog*2,1))||{};
    drawNetwork(lo,prog,ts,islandPos);

    rafId=requestAnimationFrame(loop);
  }

  function calcIslandPos(lo){
    var ic=lo.ic;
    var azW=ic*0.88,azH=azW*0.52,azX=(ic-azW)*0.5,azY=lo.oY+lo.mH*0.06;
    var maW=ic*0.82,maH=maW*1.60,maX=(ic-maW)*0.5,maY=lo.oY+lo.mH*0.82;
    return {az:{x:azX+azW*0.64,y:azY+azH*0.65},ma:{x:maX+maW*0.59,y:maY+maH*0.081}};
  }

  function start(){
    if(running) return;
    running=true;startT=null;arrivals=[];
    var lo=layout();
    initParticles(calcIslandPos(lo));
    rafId=requestAnimationFrame(loop);
  }

  function stop(){
    running=false;
    if(rafId){cancelAnimationFrame(rafId);rafId=null;}
  }

  /* ── Lazy load: só carregar districts.js quando a secção entrar no viewport ── */
  function loadDataAndStart(){
    if(window.DISTRICTS){
      start();
      return;
    }
    /* Carregar districts.js e islands.js dinamicamente */
    function loadScript(src, cb){
      var s=document.createElement('script');
      s.src=src; s.defer=true;
      s.onload=cb; document.head.appendChild(s);
    }
    loadScript('districts.js', function(){
      loadScript('islands.js', function(){
        /* requestIdleCallback para não bloquear o thread ao processar */
        if(window.requestIdleCallback){
          requestIdleCallback(function(){ resize(); start(); },{timeout:300});
        } else {
          setTimeout(function(){ resize(); start(); },50);
        }
      });
    });
  }

  /* ── Init ── */
  function init(){
    resize();
    if('IntersectionObserver' in window){
      var mapObs=new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            loadDataAndStart();
            mapObs.disconnect();
          }
        });
      },{threshold:0.05,rootMargin:'200px 0px'});
      mapObs.observe(canvas);
    } else {
      loadDataAndStart();
    }
  }

  window.addEventListener('resize',function(){
    IS_MOBILE=window.innerWidth<768;
    resize();
    if(running){startT=null;arrivals=[];mapCache=null;}
  });
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){stop();}
    else if(running||canvas.getBoundingClientRect().top<window.innerHeight){start();}
  });

  /* Pause quando sai do viewport */
  if('IntersectionObserver' in window){
    var pauseObs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){if(!running)start();}
        else{stop();}
      });
    },{threshold:0.0,rootMargin:'100px 0px'});
    /* Só adicionar este observer depois do start */
    var _origStart=start;
    start=function(){_origStart();pauseObs.observe(canvas);start=_origStart;};
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else { init(); }
})();
