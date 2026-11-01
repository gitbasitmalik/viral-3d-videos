export function build(h) {
  const { THREE, R, W, H } = h;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xc9dbec, 120, 680);
  const camera = new THREE.PerspectiveCamera(58, W / H, .1, 2000);
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x5d7a3a, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(-50, 80, 35); sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 250 }); scene.add(sun);
  // sky: BackSide sphere, ShaderMaterial gradient (horizon 0xd6e8f5 -> zenith 0x3d7cc9) + sun glow, fog:false
  // clouds: Sprites with canvas radial-gradient puff textures, fog:false, y 110-260, far away
  // ground, paths, water (ShaderMaterial sine waves + fresnel + sun glint), buildings, trees (InstancedMesh), people, props...
  // x-ray particles: export a Points scene with additive ShaderMaterial (depthTest:false) as this.over
  h.world = { scene, camera /* keep refs to animated objects here */ };
  return h.world;
}
export function update(t, h) {
  const { ss } = h, w = t < 8 ? t : t < 28 ? 8 + (t - 8) / 4 : 13 + (t - 28);
  // animate with w; camera dolly; shake in aftermath; swap maps/hide clouds while outline > 0
  const ox = ss(16, 16.7, t) * (1 - ss(23.7, 24, t));
  const pulse = t > 8 ? Math.exp(-(t - 8) * 2.2) : 0;
  const flash = Math.max(t > 23.85 && t < 24.6 ? (t < 24 ? ss(23.85, 24, t) : 1 - ss(24, 24.6, t)) : 0, t > 27.85 && t < 28.9 ? (t < 28 ? ss(27.85, 28, t) : 1 - ss(28, 28.9, t)) : 0) * .9;
  return { outline: ox, flash, ripple: pulse, rp: (t - 8) * .7, chroma: pulse * 2.5, fade: ss(51.2, 52, t) /*, scene, camera, overScene */ };
}
export function hud(t) {
  const f = x => x.toFixed(2) + ' S';
  if (t < 8) return { lab: 'Gravity disappears in', big: f(8 - t), sub: 'Central Park, New York' };
  if (t < 28) { const r = (t - 8) / 4; return { lab: 'Gravity returns in', big: f(5 - r), sub: `Shown 4x slower · ground risen ${Math.round(4.905 * r * r)} m` }; }
  return { lab: 'Gravity is', big: 'BACK', sub: '' };
}
