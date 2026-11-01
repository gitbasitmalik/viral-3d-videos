import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const Q = new URLSearchParams(location.search), V = Q.get('v'), LAYER = Q.get('layer') || 'all';
const S = await (await fetch(`videos/${V}/script.json`)).json();
const SCENE = await import(`./videos/${V}/scene.js`);
const W = 1080, H = 1920, $ = id => document.getElementById(id);
let seed = 7;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = (a, b) => a + (b - a) * rnd(), clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); }, lerp = (a, b, k) => a + (b - a) * k;
const noise1 = (x, s = 0) => Math.sin(x * 1.7 + s) * .5 + Math.sin(x * 3.1 + s * 2.3) * .3 + Math.sin(x * 7.3 + s * 1.1) * .2;
const h = { THREE, W, H, S, rnd, R, clamp, ss, lerp, noise1 };
if (LAYER === 'plate') document.querySelectorAll('.ov').forEach(e => e.style.display = 'none');
if (LAYER === 'overlay') document.documentElement.style.background = document.body.style.background = 'transparent';
$('handle').textContent = $('endHandle').textContent = S.handle; $('endTitle').innerHTML = S.endTitle; $('endFact').textContent = S.endFact;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
if (LAYER === 'overlay') renderer.domElement.style.display = 'none';
window.grab = () => renderer.domElement.toDataURL('image/jpeg', .94);
const world = SCENE.build(h);
const vs = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: +(Q.get('msaa') ?? 0) }));
const mainPass = new RenderPass(world.scene, world.camera); composer.addPass(mainPass);
const outline = new ShaderPass({ uniforms: { tDiffuse: { value: null }, mixv: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, time: { value: 0 } }, vertexShader: vs,
 fragmentShader: `uniform sampler2D tDiffuse; uniform float mixv,time; uniform vec2 res; varying vec2 vUv;
 float L(vec2 o){ return dot(texture2D(tDiffuse,vUv+o/res).rgb,vec3(.3,.59,.11)); }
 float hs(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
 void main(){ vec4 col=texture2D(tDiffuse,vUv); if(mixv<=0.){ gl_FragColor=col; return; }
  float e=0.; for(int k=1;k<=2;k++){ float s=float(k)*1.25;
   float gx=-L(vec2(-s,-s))-2.*L(vec2(-s,0))-L(vec2(-s,s))+L(vec2(s,-s))+2.*L(vec2(s,0))+L(vec2(s,s));
   float gy=-L(vec2(-s,-s))-2.*L(vec2(0,-s))-L(vec2(s,-s))+L(vec2(-s,s))+2.*L(vec2(0,s))+L(vec2(s,s));
   e+=sqrt(gx*gx+gy*gy)/float(k); }
  float line=smoothstep(.07,.26,e)*mix(1.,.4,smoothstep(.8,.93,vUv.y));
  vec2 cell=floor(gl_FragCoord.xy/2.); float st=step(.9965,hs(cell))*(.5+.5*sin(time*3.+hs(cell+3.)*40.));
  vec3 o=vec3(1.)*line*1.8+vec3(st)*1.2+vec3(.006,.008,.012)+(hs(gl_FragCoord.xy+fract(time)*100.)-.5)*.03;
  gl_FragColor=vec4(mix(col.rgb,o,mixv),1.); }` });
composer.addPass(outline);
const overPass = new RenderPass(new THREE.Scene(), world.camera); overPass.clear = false; overPass.enabled = false; composer.addPass(overPass);
const fx = new ShaderPass({ uniforms: { tDiffuse: { value: null }, flash: { value: 0 }, chroma: { value: 0 }, ripple: { value: 0 }, rp: { value: 0 }, fade: { value: 0 }, time: { value: 0 }, res: { value: new THREE.Vector2(W, H) } }, vertexShader: vs,
 fragmentShader: `uniform sampler2D tDiffuse; uniform float flash,chroma,ripple,rp,fade,time; uniform vec2 res; varying vec2 vUv;
 float hs(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
 void main(){ vec2 uv=vUv; vec2 d=uv-.5; d.y*=res.y/res.x; float r=length(d);
  float ring=exp(-pow((r-rp)*14.,2.))*ripple; uv+=normalize(d+1e-5)*ring*.02*vec2(1.,res.x/res.y);
  vec2 ca=(uv-.5)*chroma*.012;
  vec3 c=vec3(texture2D(tDiffuse,uv+ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-ca).b);
  c+=vec3(.7,.85,1.)*ring*.25; c*=mix(.72,1.,smoothstep(1.25,.35,r)); c=mix(c,vec3(1.6),flash);
  c+=(hs(gl_FragCoord.xy+fract(time*7.)*311.)-.5)*.018; c*=1.-fade; gl_FragColor=vec4(c,1.); }` });
composer.addPass(fx); composer.addPass(new OutputPass());
function setOp(el, a, b) { el.style.opacity = a; el.style.filter = b > .05 ? `blur(${b}px)` : 'none'; }
function overlay(t, hd, ox) {
 let html = '', a = 0, bl = 0;
 for (const [s, e, txt] of S.captions) if (t >= s - .01 && t <= e) { html = txt; a = ss(s, s + .45, t) * (1 - ss(e - .4, e, t)); bl = (1 - ss(s, s + .5, t)) * 8; }
 if ($('cap').innerHTML !== html) $('cap').innerHTML = html; setOp($('cap'), a, bl); $('capbg').style.opacity = (ox || 0) * a;
 $('title').innerHTML = S.title; setOp($('title'), ss(.2, .8, t) * (1 - ss(S.titleEnd - .5, S.titleEnd, t)), (1 - ss(.2, .9, t)) * 6);
 $('lab').textContent = hd.lab || ''; $('big').textContent = hd.big || ''; $('sub').textContent = hd.sub || '';
 const hA = (hd.a ?? 1) * (1 - ss(S.endStart - 1, S.endStart - .2, t)); $('hud').style.opacity = hA; $('handle').style.opacity = .85 * hA; $('shade').style.opacity = hA;
 $('end').style.opacity = ss(S.endStart, S.endStart + .6, t) * (1 - ss(S.duration - .8, S.duration - .1, t));
 const P = S.press, on = t > P, pk = ss(P, P + .3, t);
 $('btn').style.background = on ? '#fff' : '#e8265e'; $('btn').style.color = on ? '#e8265e' : '#fff';
 $('btnIcon').textContent = on ? '✓' : '+'; $('btnIcon').style.fontSize = on ? '54px' : '70px';
 $('btn').style.transform = `scale(${1 + Math.sin(pk * Math.PI) * .18 - (t > P - .3 && t < P ? ss(P - .3, P - .05, t) * .12 : 0)})`;
}
window.renderAt = t => {
 const f = SCENE.update(t, h) || {};
 mainPass.scene = f.scene || world.scene; mainPass.camera = f.camera || world.camera;
 outline.uniforms.mixv.value = f.outline || 0; outline.uniforms.time.value = t;
 overPass.enabled = !!f.overScene; if (f.overScene) { overPass.scene = f.overScene; overPass.camera = f.camera || world.camera; }
 const u = fx.uniforms; u.flash.value = f.flash || 0; u.chroma.value = f.chroma || 0; u.ripple.value = f.ripple || 0; u.rp.value = f.rp || 0; u.fade.value = f.fade || 0; u.time.value = t;
 overlay(t, SCENE.hud(t), f.outline);
 if (LAYER !== 'overlay') composer.render();
 return true;
};
await Promise.all(['500 88px Corm', 'italic 500 60px Corm', '500 23px Plex', '400 20px Plex'].map(x => document.fonts.load(x)));
await document.fonts.ready; window.ready = true;
