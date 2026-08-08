/* ════════ GOOGLE ANALYTICS — só com consentimento ════════ */
function loadGA(){
  var id = window.GA_ID;
  if(!id || id === 'G-XXXXXXXXXX') return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
}

/* ════════ COOKIES + ACESSIBILIDADE — aguarda DOM ════════ */
document.addEventListener('DOMContentLoaded', function(){

  /* ── Cookies ── */
  var banner = document.getElementById('cookieBanner');
  var btnAcc = document.getElementById('cookieAccept');
  var btnRej = document.getElementById('cookieReject');

  if(banner){
    var choice = localStorage.getItem('ld-cookies');
    if(choice){
      banner.classList.add('hidden');
      banner.setAttribute('aria-hidden','true');
      if(choice === 'accepted') loadGA();
    } else {
      setTimeout(function(){
        banner.removeAttribute('aria-hidden');
      }, 900);
    }
    function dismiss(c){
      localStorage.setItem('ld-cookies', c);
      banner.classList.add('hidden');
      banner.setAttribute('aria-hidden','true');
      if(c === 'accepted') loadGA();
    }
    if(btnAcc) {
      btnAcc.addEventListener('click', function(){ dismiss('accepted'); });
      btnAcc.addEventListener('touchstart', function(e){ e.preventDefault(); dismiss('accepted'); }, {passive:false});
    }
    if(btnRej) {
      btnRej.addEventListener('click', function(){ dismiss('rejected'); });
      btnRej.addEventListener('touchstart', function(e){ e.preventDefault(); dismiss('rejected'); }, {passive:false});
    }
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !banner.classList.contains('hidden')) dismiss('rejected');
    });
  }

  /* ── Acessibilidade ── */
  var trigger = document.getElementById('a11yTrigger');
  var panel   = document.getElementById('a11yPanel');
  var root    = document.documentElement;

  if(trigger && panel){
    trigger.addEventListener('click', function(){
      var open = panel.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(open){ var f = panel.querySelector('input,button'); if(f) f.focus(); }
    });
    document.addEventListener('click', function(e){
      var w = document.getElementById('a11yWidget');
      if(w && !w.contains(e.target)){ panel.classList.remove('open'); trigger.setAttribute('aria-expanded','false'); }
    });
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape' && panel.classList.contains('open')){ panel.classList.remove('open'); trigger.setAttribute('aria-expanded','false'); trigger.focus(); }
    });

    var prefs = {};
    try{ prefs = JSON.parse(localStorage.getItem('ld-a11y')||'{}'); }catch(e){}

    function applyPref(id,cls){ if(prefs[id]){ root.classList.add(cls); var el=document.getElementById(id); if(el) el.checked=true; } }
    applyPref('a11y-font','a11y-font');
    applyPref('a11y-contrast','a11y-contrast');
    applyPref('a11y-motion','a11y-motion');
    applyPref('a11y-dyslexia','a11y-dyslexia');

    function togglePref(id,cls){ var el=document.getElementById(id); if(!el) return; el.addEventListener('change',function(){ if(this.checked){root.classList.add(cls);prefs[id]=true;}else{root.classList.remove(cls);delete prefs[id];} try{localStorage.setItem('ld-a11y',JSON.stringify(prefs));}catch(e){} }); }
    togglePref('a11y-font','a11y-font');
    togglePref('a11y-contrast','a11y-contrast');
    togglePref('a11y-motion','a11y-motion');
    togglePref('a11y-dyslexia','a11y-dyslexia');

    var rb = document.getElementById('a11yReset');
    if(rb) rb.addEventListener('click',function(){
      ['a11y-font','a11y-contrast','a11y-motion','a11y-dyslexia'].forEach(function(c){ root.classList.remove(c); var el=document.getElementById(c); if(el) el.checked=false; });
      prefs={}; try{localStorage.removeItem('ld-a11y');}catch(e){}
    });
  }

  /* Live region */
  var lr = document.createElement('div');
  lr.setAttribute('role','status'); lr.setAttribute('aria-live','polite'); lr.setAttribute('aria-atomic','true');
  lr.className='sr-only'; document.body.appendChild(lr);
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(){
      var t=document.querySelector(link.getAttribute('href'));
      if(t){ var h=t.querySelector('h1,h2,h3'); if(h) lr.textContent='Secção: '+h.textContent.trim(); }
    });
  });

}); /* fim DOMContentLoaded */

/* ════════════════════════════════════════════════════════════════
   LUMINÁRIA DIGITAL v15 — Hero Clarão Dourado
   Fundo: esfera de luz suave (estilo da imagem de referência)
   em tons âmbar/dourado com movimento orgânico lento.
   Simples, leve, otimizado.
   ════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var html    = document.documentElement;
var nav     = document.getElementById('nav');
var burger  = document.getElementById('navBurger');
var mobile  = document.getElementById('navMobile');
var backTop = document.getElementById('backTop');
var form    = document.getElementById('contactForm');
var formOk  = document.getElementById('formSuccess');
var canvas  = document.getElementById('heroCanvas');
var content = document.getElementById('heroContent');
var globalCanvas = document.getElementById('globalFX');

/* ════════ TEMA — só solar ════════ */
html.setAttribute('data-theme', 'solar');
function lerp(a,b,t){ return a+(b-a)*t; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

/* ════════════════════════════════════════════════════════════════
   CANVAS DO CLARÃO — esfera suave dourada/âmbar
   Inspira-se na imagem de referência: círculo azul escuro com
   aura suave. Aqui fazemos em amarelo/dourado.
════════════════════════════════════════════════════════════════ */
var ctx, W, H, DPR;
var tick = 0;
var started = false;

function resize(){
  DPR = Math.min(window.devicePixelRatio||1,2);
  W   = canvas.offsetWidth;
  H   = canvas.offsetHeight;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}

if(canvas){
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

/* Paleta solar: âmbar/dourado
   Paleta lunar: azul índigo (mais frio, como a imagem de referência) */
function getColors(){
  /* Amarelo solar limpo — como luz de estúdio */
  return {
    core:  [140, 90,  0],
    mid:   [200, 155, 10],
    outer: [245, 197, 24],
    glow:  [255, 230, 100],
  };
}

function rgb(c, a){
  return 'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+(a||1)+')';
}

var _isMobile = window.innerWidth < 768;
window.addEventListener('resize', function(){ _isMobile = window.innerWidth < 768; });

function drawGlow(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  tick += 0.004;

  var cx = W * 0.50;
  var cy = H * 0.42;
  /* Respiração lenta — idêntica em mobile e desktop */
  var pulse = 1 + Math.sin(tick * (_isMobile ? 0.09 : 0.18)) * 0.010;
  var breathe = (Math.sin(tick * (_isMobile ? 0.11 : 0.22)) + 1) * 0.5;

  /* Aura exterior — grande e muito subtil */
  var R1 = Math.min(W,H) * 0.65 * pulse;
  var g1 = ctx.createRadialGradient(cx,cy,0,cx,cy,R1);
  g1.addColorStop(0.0,  'rgba(255,255,255, 0.00)');
  g1.addColorStop(0.18, 'rgba(200,215,255, 0.03)');
  g1.addColorStop(0.42, 'rgba(150,185,255,' + (_isMobile ? 0.025 : 0.07) + ')');
  g1.addColorStop(0.68, 'rgba(100,145,230, 0.03)');
  g1.addColorStop(1.0,  'rgba(60,100,200,  0.00)');
  ctx.beginPath(); ctx.arc(cx,cy,R1,0,Math.PI*2);
  ctx.fillStyle=g1; ctx.fill();

  /* Núcleo — intensidade muito baixa e variação mínima: 0.12 a 0.18 */
  var R2 = Math.min(W,H) * (0.20 + breathe * 0.02) * pulse;
  var intensity = _isMobile ? (0.05 + breathe * 0.018) : (0.10 + breathe * 0.04);
  var g2 = ctx.createRadialGradient(cx,cy,0,cx,cy,R2);
  g2.addColorStop(0.0,  'rgba(255,255,255,' + (_isMobile ? intensity*1.1 : intensity*1.6) + ')');
  g2.addColorStop(0.22, 'rgba(220,235,255,' + (intensity*1.1) + ')');
  g2.addColorStop(0.55, 'rgba(160,195,255,' + (intensity*0.5) + ')');
  g2.addColorStop(1.0,  'rgba(100,150,240, 0.00)');
  ctx.beginPath(); ctx.arc(cx,cy,R2,0,Math.PI*2);
  ctx.fillStyle=g2; ctx.fill();

  /* Raio vertical — só desktop */
  var breatheRay = (Math.sin(tick * 0.08) + 1) * 0.5;
  if(_isMobile){ /* skip */ } else {
  var rH = R1 * 1.05;
  var rg = ctx.createLinearGradient(cx,cy-rH,cx,cy+rH);
  rg.addColorStop(0,    'rgba(255,255,255,0.000)');
  rg.addColorStop(0.35, 'rgba(255,255,255,' + (breatheRay*0.025) + ')');
  rg.addColorStop(0.50, 'rgba(255,255,255,' + (breatheRay*0.045) + ')');
  rg.addColorStop(0.65, 'rgba(255,255,255,' + (breatheRay*0.025) + ')');
  rg.addColorStop(1,    'rgba(255,255,255,0.000)');
  ctx.beginPath();
  ctx.ellipse(cx, cy, W*0.03, rH, 0, 0, Math.PI*2);
  ctx.fillStyle=rg; ctx.fill();
  } /* fim else desktop raio */

  /* Partículas brancas/azul gelo */
  if(!drawGlow._pts){
    drawGlow._pts=[];
    var nPts=_isMobile?8:22;
    for(var i=0;i<nPts;i++){
      drawGlow._pts.push({
        a:Math.random()*Math.PI*2,
        dist:0.12+Math.random()*0.70,
        speed:(Math.random()-.5)*.0022,
        r:Math.random()*1.8+.4,
        bri:Math.random()*.45+.15,
        ph:Math.random()*Math.PI*2,
        blue:Math.random()<0.4,
      });
    }
  }
  drawGlow._pts.forEach(function(p){
    p.a+=p.speed;
    var R=Math.min(W,H)*0.26;
    var px=cx+Math.cos(p.a)*R*p.dist*1.9;
    var py=cy+Math.sin(p.a)*R*p.dist*1.9;
    var tw=.5+.5*Math.sin(tick*0.6+p.ph);
    var a=p.bri*tw*0.5;
    ctx.save(); ctx.globalAlpha=a;
    var col = p.blue ? 'rgba(100,160,255,0.9)' : 'rgba(255,255,255,0.95)';
    if(_isMobile){
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.arc(px,py,p.r,0,Math.PI*2); ctx.fill();
    } else {
      var pg=ctx.createRadialGradient(px,py,0,px,py,p.r*2.5);
      pg.addColorStop(0,col);
      pg.addColorStop(1,'rgba(100,150,255,0)');
      ctx.beginPath(); ctx.arc(px,py,p.r*2.5,0,Math.PI*2);
      ctx.fillStyle=pg; ctx.fill();
    }
    ctx.restore();
  });
}

/* Fade-in do conteúdo */
function showContent(){
  if(!content || started) return;
  started = true;
  content.style.transition = 'opacity 1.4s ease, transform 1.4s ease';
  content.style.opacity    = '1';
  content.style.transform  = 'translateY(0)';
}

if(content){
  content.style.opacity  = '0';
  content.style.transform= 'translateY(16px)';
  setTimeout(showContent, 600);
}

/* ════════ HALO DE LUZ ATRÁS DO LOGO ════════
   Canvas pequeno animado que fica atrás do texto "Luminária"
   — esfera de luz suave, mais intensa que o fundo geral      */
var haloEl = document.getElementById('logoHalo');
var haloCanvas, haloCtx, hW, hH;

function setupHalo(){
  if(!haloEl) return;
  haloCanvas = document.createElement('canvas');
  haloCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  haloEl.appendChild(haloCanvas);
  resizeHalo();
  window.addEventListener('resize', resizeHalo);
}

function resizeHalo(){
  if(!haloCanvas||!haloEl) return;
  var dpr = Math.min(window.devicePixelRatio||1,2);
  hW = haloEl.offsetWidth;
  hH = haloEl.offsetHeight;
  haloCanvas.width  = hW * dpr;
  haloCanvas.height = hH * dpr;
  haloCtx = haloCanvas.getContext('2d');
  haloCtx.setTransform(dpr,0,0,dpr,0,0);
}

function drawHalo(t){
  if(!haloCtx||!hW) return;
  haloCtx.clearRect(0,0,hW,hH);
  var cx=hW*.5, cy=hH*.5;
  /* Respiração lenta: ciclo ~35s a 60fps (tick sobe 0.004/frame) */
  var pulse=1+Math.sin(t*0.18)*.022;
  var breathe=(Math.sin(t*0.12)+1)*0.5;
  /* Halo exterior — grande, muito transparente */
  var r1=Math.min(hW,hH)*.72*pulse;
  var g1=haloCtx.createRadialGradient(cx,cy,0,cx,cy,r1);
  g1.addColorStop(0.0,  'rgba(255,255,255, 0.00)');
  g1.addColorStop(0.20, 'rgba(200,220,255, 0.04)');
  g1.addColorStop(0.48, 'rgba(150,190,255, 0.08)');
  g1.addColorStop(0.72, 'rgba(100,155,240, 0.03)');
  g1.addColorStop(1.0,  'rgba(60,110,210,  0.00)');
  haloCtx.beginPath(); haloCtx.arc(cx,cy,r1,0,Math.PI*2);
  haloCtx.fillStyle=g1; haloCtx.fill();
  /* Núcleo — varia entre 0.07 e 0.13, muito subtil */
  var r2=Math.min(hW,hH)*.26*pulse;
  var intensity=0.07+breathe*0.06;
  var g2=haloCtx.createRadialGradient(cx,cy,0,cx,cy,r2);
  g2.addColorStop(0.0,  'rgba(255,255,255,'+(intensity*1.1)+')');
  g2.addColorStop(0.45, 'rgba(200,225,255,'+intensity+')');
  g2.addColorStop(1.0,  'rgba(150,190,255, 0.00)');
  haloCtx.beginPath(); haloCtx.arc(cx,cy,r2,0,Math.PI*2);
  haloCtx.fillStyle=g2; haloCtx.fill();
}

setTimeout(setupHalo, 100);


/* ════════════════════════════════════════════════════════════════
   GLOBAL CANVAS — cursor/touch FX
════════════════════════════════════════════════════════════════ */
var gCtx, gW, gH, gDPR;
var gPtr={x:-9999,y:-9999,active:false,px:-9999,py:-9999,speed:0};
var rings=[],gParts=[];

function resizeGlobal(){
  gDPR=Math.min(window.devicePixelRatio||1,2);
  gW=window.innerWidth; gH=window.innerHeight;
  globalCanvas.width=gW*gDPR; globalCanvas.height=gH*gDPR;
  gCtx.setTransform(gDPR,0,0,gDPR,0,0);
}
if(globalCanvas){
  gCtx=globalCanvas.getContext('2d');
  resizeGlobal();
  window.addEventListener('resize',resizeGlobal);
}

function accentRgba(a){
  return 'rgba(91,130,245,'+a+')';
}

function spawnRing(x,y){
  rings.push({x:x,y:y,r:2,alpha:.80,maxR:60+Math.random()*40});
  rings.push({x:x,y:y,r:8,alpha:.35,maxR:90+Math.random()*30});
}
function spawnParts(x,y,n){
  for(var i=0;i<n;i++){
    var a=Math.random()*Math.PI*2,sp=.5+Math.random()*2;
    gParts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.5,r:Math.random()*2+.5,alpha:.8,life:1,decay:.010+Math.random()*.015});
  }
  while(gParts.length>100) gParts.shift();
}

function drawGlobal(){
  if(!gCtx) return;
  gCtx.clearRect(0,0,gW,gH);
  rings=rings.filter(function(r){
    r.r+=(r.maxR-r.r)*.09+.6; r.alpha*=.92;
    if(r.alpha<.01) return false;
    gCtx.save(); gCtx.globalCompositeOperation='screen';
    gCtx.strokeStyle=accentRgba(r.alpha); gCtx.lineWidth=1.5;
    gCtx.beginPath(); gCtx.arc(r.x,r.y,r.r,0,Math.PI*2); gCtx.stroke();
    gCtx.restore(); return true;
  });
  gParts=gParts.filter(function(p){
    p.x+=p.vx; p.y+=p.vy; p.vy+=.025; p.vx*=.98; p.life-=p.decay;
    if(p.life<=0) return false;
    var a=p.alpha*p.life;
    gCtx.save(); gCtx.globalCompositeOperation='screen';
    var pg=gCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2);
    pg.addColorStop(0,accentRgba(a)); pg.addColorStop(1,accentRgba(0));
    gCtx.beginPath(); gCtx.arc(p.x,p.y,p.r*2,0,Math.PI*2);
    gCtx.fillStyle=pg; gCtx.fill(); gCtx.restore(); return true;
  });
  if(gPtr.active){
    var hr=30+gPtr.speed*8;
    var hg=gCtx.createRadialGradient(gPtr.x,gPtr.y,0,gPtr.x,gPtr.y,hr);
    hg.addColorStop(0,accentRgba(.15+gPtr.speed*.04)); hg.addColorStop(1,accentRgba(0));
    gCtx.save(); gCtx.globalCompositeOperation='screen';
    gCtx.beginPath(); gCtx.arc(gPtr.x,gPtr.y,hr,0,Math.PI*2);
    gCtx.fillStyle=hg; gCtx.fill(); gCtx.restore();
    if(gPtr.speed>1.5&&Math.random()<.45) spawnParts(gPtr.x,gPtr.y,1);
  }
}

document.addEventListener('mousemove',function(e){
  var nx=e.clientX,ny=e.clientY;
  gPtr.vx=nx-gPtr.px; gPtr.vy=ny-gPtr.py;
  gPtr.speed=Math.min(Math.sqrt(gPtr.vx*gPtr.vx+gPtr.vy*gPtr.vy)*.10,5);
  gPtr.px=gPtr.x; gPtr.py=gPtr.y; gPtr.x=nx; gPtr.y=ny; gPtr.active=true;
});
document.addEventListener('mouseleave',function(){gPtr.active=false;gPtr.speed=0;});
document.addEventListener('click',function(e){spawnRing(e.clientX,e.clientY);spawnParts(e.clientX,e.clientY,12);});
document.addEventListener('touchstart',function(e){Array.from(e.changedTouches).forEach(function(t){gPtr.x=t.clientX;gPtr.y=t.clientY;gPtr.active=true;spawnRing(t.clientX,t.clientY);spawnParts(t.clientX,t.clientY,10);});},{passive:true});
document.addEventListener('touchmove',function(e){Array.from(e.changedTouches).forEach(function(t){var nx=t.clientX,ny=t.clientY;gPtr.speed=3;gPtr.x=nx;gPtr.y=ny;gPtr.active=true;if(Math.random()<.35)spawnParts(nx,ny,2);});},{passive:true});
document.addEventListener('touchend',function(){gPtr.active=false;gPtr.speed=0;},{passive:true});



/* ════════ EFEITO CLICK — onda de luz ════════ */
var clickWaves = [];

function spawnClickWave(x, y) {
  clickWaves.push({
    x: x, y: y,
    r: 0,
    maxR: Math.min(canvas.width, canvas.height) * 0.5,
    alpha: 0.9,
    speed: 6,
    ring2: 0,
    ring2alpha: 0
  });
}

function drawClickWaves() {
  clickWaves = clickWaves.filter(function(w) { return w.alpha > 0.01; });
  clickWaves.forEach(function(w) {
    /* anel principal */
    ctx.save();
    ctx.globalAlpha = w.alpha * 0.7;
    ctx.strokeStyle = 'rgba(140,190,255,0.9)';
    ctx.shadowColor  = 'rgba(91,130,245,1)';
    ctx.shadowBlur   = 18;
    ctx.lineWidth    = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    /* anel interior mais brilhante */
    if (w.r > 20) {
      ctx.save();
      ctx.globalAlpha = w.alpha * 0.4;
      ctx.strokeStyle = 'rgba(200,225,255,0.8)';
      ctx.shadowColor  = 'rgba(200,225,255,1)';
      ctx.shadowBlur   = 30;
      ctx.lineWidth    = 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* flash central inicial */
    if (w.r < 40) {
      var flashAlpha = (1 - w.r / 40) * 0.6;
      ctx.save();
      ctx.globalAlpha = flashAlpha * w.alpha;
      var grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 40);
      grad.addColorStop(0, 'rgba(180,210,255,0.9)');
      grad.addColorStop(0.4, 'rgba(91,130,245,0.4)');
      grad.addColorStop(1, 'rgba(45,91,227,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* actualizar */
    w.r     += w.speed;
    w.alpha  = Math.max(0, 1 - w.r / w.maxR);
    w.speed  = Math.max(3, w.speed * 0.97);
  });
}

/* click no canvas ou na secção hero */
var heroSection = document.getElementById('inicio');
if (heroSection) {
  heroSection.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top)  * scaleY;
    spawnClickWave(x, y);
    /* segunda onda desfasada */
    setTimeout(function() {
      if (clickWaves.length > 0) {
        clickWaves.push({
          x: x, y: y,
          r: 15,
          maxR: Math.min(canvas.width, canvas.height) * 0.35,
          alpha: 0.6,
          speed: 4,
        });
      }
    }, 120);
  });
}

/* touch — funciona em qualquer parte do ecrã em mobile */
document.addEventListener('touchstart', function(e) {
  if(!_isMobile) return;
  var touch = e.touches[0];
  /* Criar ripple CSS no ponto de toque */
  var ripple = document.createElement('div');
  ripple.className = 'touch-ripple';
  ripple.style.left = touch.clientX + 'px';
  ripple.style.top  = touch.clientY + 'px';
  document.body.appendChild(ripple);
  setTimeout(function(){ ripple.remove(); }, 700);
  /* Também no canvas da hero se estiver visível */
  if(heroSection && canvas){
    var rect = canvas.getBoundingClientRect();
    if(rect.width > 0){
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var x = (touch.clientX - rect.left) * scaleX;
      var y = (touch.clientY - rect.top)  * scaleY;
      if(x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height){
        spawnClickWave(x, y);
      }
    }
  }
}, {passive: true});

/* ════════ LOOP ════════ */
var isVisible = true;
document.addEventListener('visibilitychange', function(){
  isVisible = !document.hidden;
  if(isVisible) requestAnimationFrame(mainLoop);
});

var haloTick=0;
var _lastFrame = 0;
function mainLoop(ts){
  if(!isVisible) return;
  if(_isMobile){
    /* Mobile: 30fps mas sem throttle quando há ondas de toque */
    if(clickWaves.length === 0 && ts - _lastFrame < 33){ requestAnimationFrame(mainLoop); return; }
    _lastFrame = ts;
  }
  tick++;
  haloTick+=0.004;
  drawClickWaves();
  drawGlow();
  /* Em mobile: drawGlobal só quando há faíscas activas (toque) */
  if(!_isMobile || gParts.length > 0 || rings.length > 0) drawGlobal();
  if(!_isMobile) drawHalo(haloTick);
  requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);


/* ════════ NAV ════════ */
function onScroll(){nav.classList.toggle('scrolled',window.scrollY>60);backTop.classList.toggle('show',window.scrollY>600);}
var _sPend=false;
window.addEventListener('scroll',function(){if(!_sPend){_sPend=true;requestAnimationFrame(function(){onScroll();_sPend=false;});}},{passive:true,capture:false}); onScroll();
backTop.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});

burger.addEventListener('click',function(){
  var open=mobile.classList.contains('open');
  mobile.classList.toggle('open'); burger.classList.toggle('active');
  document.body.style.overflow=open?'':'hidden';
});
document.querySelectorAll('.nav-mobile-link').forEach(function(l){
  l.addEventListener('click',function(){mobile.classList.remove('open');burger.classList.remove('active');document.body.style.overflow='';});
});

/* Reveal */
if(window.innerWidth<768){
  /* Mobile: reveal imediato, sem animação — evita repaints */
  document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('visible');});
} else {
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  },{threshold:.1,rootMargin:'0px 0px -60px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
}

/* Prefers-reduced-motion — desactivar animações se necessário */
if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){
  document.querySelectorAll('.reveal').forEach(function(el){
    el.classList.add('visible');
  });
}

/* Nav active */
var secs=document.querySelectorAll('section[id]'),navA=document.querySelectorAll('.nav-links a');
var _navPending=false;
window.addEventListener('scroll',function(){
  if(!_navPending){_navPending=true;requestAnimationFrame(function(){
    var y=window.scrollY+120,cur='';
    secs.forEach(function(s){if(y>=s.offsetTop)cur=s.id;});
    navA.forEach(function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+cur);});
    _navPending=false;
  });}
},{passive:true});

/* FAQ */
var faqBtns=document.querySelectorAll('.faq-q');
faqBtns.forEach(function(btn){btn.addEventListener('click',function(){var open=btn.getAttribute('aria-expanded')==='true';faqBtns.forEach(function(b){b.setAttribute('aria-expanded','false');b.nextElementSibling.classList.remove('open');});if(!open){btn.setAttribute('aria-expanded','true');btn.nextElementSibling.classList.add('open');}});});

/* ════ EMAILJS CONFIG ════ */
var EMAILJS_CFG = {
  publicKey:  '39arumPjSQmsLiiU7',
  serviceId:  'service_6c0pd55',
  templateId: 'template_84huyi8',
};
if (window.emailjs && EMAILJS_CFG.publicKey.indexOf('AQUI') === -1) {
  emailjs.init({ publicKey: EMAILJS_CFG.publicKey });
}

/* Botao WhatsApp */
var btnWA = document.getElementById('btnWhatsApp');
if(btnWA){
  btnWA.addEventListener('click', function(){
    var nome     = (document.getElementById('nome')||{value:''}).value.trim();
    var email    = (document.getElementById('email')||{value:''}).value.trim();
    var empresa  = (document.getElementById('empresa')||{value:''}).value.trim();
    var assunto  = (document.getElementById('assunto')||{value:''}).value.trim();
    var mensagem = (document.getElementById('mensagem')||{value:''}).value.trim();
    var linhas = [];
    linhas.push('Olá!');
    linhas.push('Vim pelo site luminaria.pt e gostava de saber mais sobre os vossos serviços.');
    linhas.push('');
    if(nome)     linhas.push('Nome: ' + nome);
    if(email)    linhas.push('Email: ' + email);
    if(empresa)  linhas.push('Empresa: ' + empresa);
    if(assunto)  linhas.push('Serviço pretendido: ' + assunto);
    if(mensagem) { linhas.push(''); linhas.push('Mensagem: ' + mensagem); }
    linhas.push('');
    linhas.push('Quando podemos agendar uma conversa?');
    var msg = encodeURIComponent(linhas.join('\n'));
    window.open('https://wa.me/351961149641?text=' + msg, '_blank');
  });
}

/* Botao Email via EmailJS */
if(form){form.addEventListener('submit',function(e){
  e.preventDefault();
  var em=document.getElementById('email'),tel=document.getElementById('telefone'),mg=document.getElementById('mensagem'),ok=true;
  var contactOk=((em&&em.value.trim())||(tel&&tel.value.trim()));
  var errHint=document.getElementById('contactError');
  if(!contactOk){if(em)em.style.borderColor='rgba(239,68,68,.80)';if(tel)tel.style.borderColor='rgba(239,68,68,.80)';if(errHint)errHint.style.display='block';ok=false;}
  else{if(em)em.style.borderColor='';if(tel)tel.style.borderColor='';if(errHint)errHint.style.display='none';}
  [mg].forEach(function(el){if(!el.value.trim()){el.style.borderColor='rgba(91,130,245,.80)';ok=false;}else{el.style.borderColor='';}});
  if(!ok)return;
  var hp=(document.getElementById('_hp')||{}).value||'';
  var btn=document.getElementById('btnEmail'),txt=btn?btn.querySelector('.btn-text'):null;
  if(hp!==''){form.reset();formOk.classList.add('show');setTimeout(function(){formOk.classList.remove('show');},7000);return;}
  if(!window.emailjs||EMAILJS_CFG.publicKey.indexOf('AQUI')!==-1){
    alert('Formulario ainda nao configurado. Contacte-nos por email ou WhatsApp.');return;
  }
  if(btn)btn.disabled=true;
  if(txt)txt.textContent='A enviar...';
  emailjs.send(EMAILJS_CFG.serviceId, EMAILJS_CFG.templateId, {
    nome:     document.getElementById('nome').value,
    empresa:  document.getElementById('empresa').value || '-',
    email:    (em.value || '').trim(),
    telefone: document.getElementById('telefone').value || '-',
    website:  (document.getElementById('website')||{value:''}).value || '-',
    assunto:  document.getElementById('assunto').value || '-',
    mensagem: mg.value,
    reply_to: (em.value || '').trim() || 'geral@luminaria.pt',
    data:     new Date().toLocaleString('pt-PT'),
  }).then(function(){
    if(btn)btn.disabled=false;if(txt)txt.textContent='Enviar Email';
    form.reset();formOk.classList.add('show');
    setTimeout(function(){formOk.classList.remove('show');},7000);
  }).catch(function(err){
    if(btn)btn.disabled=false;if(txt)txt.textContent='Enviar Email';
    console.error('[Luminaria] EmailJS:',err);
    alert('Nao foi possivel enviar. Tente novamente ou contacte-nos por WhatsApp.');
  });
})}

})();
