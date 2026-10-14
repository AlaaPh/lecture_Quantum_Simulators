// Three.js view with a custom orbit camera, draggable handles, HTML labels and small builders
// for arrows, segments, the unit sphere and point clouds. Axes: e1 = x, e2 = y, e3 = z (vertical).
import * as THREE from '../vendor/three.module.min.js';
import { colors, hexToRgb } from './theme.js';

const Y = new THREE.Vector3(0, 1, 0);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const DEFAULT_ORBIT = { az: -0.95, el: 0.42, dist: 7.0 };

export class View3D {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'gl';
    this.labelLayer = document.createElement('div'); this.labelLayer.className = 'labels';
    container.append(this.canvas, this.labelLayer);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.up.set(0, 0, 1);
    this.orbit = { ...DEFAULT_ORBIT };
    this.target = [0, 0, 0];
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(1.5, 2.5, 3);
    this.camera.add(key); this.scene.add(this.camera);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.labels = []; this.handles = []; this.tickers = new Set(); this.themed = [];
    this.dirty = true; this.running = true; this.lastT = performance.now();
    this.raycaster = new THREE.Raycaster();
    this._drag = null; this._orbiting = null;
    this.ro = new ResizeObserver(() => this._resize());
    this.ro.observe(container);
    this._resize();
    this._bindEvents();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }
  // ---------- camera ----------
  _resize() {
    const w = Math.max(10, this.container.clientWidth), h = Math.max(10, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  _placeCamera() {
    const { az, el } = this.orbit;
    const dist = this.orbit.dist * Math.max(1, 1 / this.camera.aspect); // keep the scene framed in tall stages too
    this.camera.position.set(dist * Math.cos(el) * Math.cos(az), dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el));
    this.camera.lookAt(this.target[0], this.target[1], this.target[2]);
  }
  setTarget(x, y, z) { this.target = [x, y, z]; this.dirty = true; }
  resetCamera() { this.orbit = { ...DEFAULT_ORBIT }; this.target = [0, 0, 0]; this.dirty = true; }
  setVisible(v) { this.container.hidden = !v; this.running = v; if (v) { this._resize(); this.dirty = true; } }
  requestRender() { this.dirty = true; }
  addTicker(fn) { this.tickers.add(fn); return () => this.tickers.delete(fn); }
  _loop(now) {
    requestAnimationFrame(this._loop);
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.lastT) / 1000); this.lastT = now;
    for (const t of this.tickers) { if (t(dt) !== false) this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false;
    this._placeCamera();
    this.renderer.render(this.scene, this.camera);
    this._updateLabels();
  }
  // ---------- events: orbit, zoom, drag handles ----------
  _ndc(e) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const h = this._pickHandle(e);
      c.setPointerCapture(e.pointerId);
      if (h) { this._drag = { h, id: e.pointerId }; c.style.cursor = 'grabbing'; h.onStart && h.onStart(); }
      else this._orbiting = { x: e.clientX, y: e.clientY, az: this.orbit.az, el: this.orbit.el, id: e.pointerId };
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      if (this._drag && this._drag.id === e.pointerId) { this._dragTo(e); return; }
      if (this._orbiting && this._orbiting.id === e.pointerId) {
        const o = this._orbiting;
        this.orbit.az = o.az - (e.clientX - o.x) * 0.008;
        this.orbit.el = Math.max(-1.45, Math.min(1.45, o.el + (e.clientY - o.y) * 0.008));
        this.dirty = true; return;
      }
      c.style.cursor = this._pickHandle(e) ? 'grab' : 'default';
    });
    const end = (e) => {
      if (this._drag && this._drag.id === e.pointerId) { this._drag.h.onEnd && this._drag.h.onEnd(); this._drag = null; c.style.cursor = 'default'; }
      if (this._orbiting && this._orbiting.id === e.pointerId) this._orbiting = null;
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.orbit.dist = Math.max(2.4, Math.min(14, this.orbit.dist * Math.exp(e.deltaY * 0.0012))); this.dirty = true; }, { passive: false });
    c.addEventListener('dblclick', () => this.resetCamera());
  }
  _pickHandle(e) {
    if (!this.handles.length) return null;
    this.raycaster.setFromCamera(this._ndc(e), this.camera);
    const meshes = this.handles.filter((h) => h.mesh.visible && h.mesh.parent).map((h) => h.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return hit ? this.handles.find((h) => h.mesh === hit.object) : null;
  }
  _dragTo(e) {
    const h = this._drag.h;
    this.raycaster.setFromCamera(this._ndc(e), this.camera);
    const o = this.raycaster.ray.origin, d = this.raycaster.ray.direction;
    let p;
    if (h.mode === 'sphere') {
      const R = h.radius || 1;
      const b = o.dot(d), cc = o.dot(o) - R * R, disc = b * b - cc;
      if (disc >= 0) p = o.clone().add(d.clone().multiplyScalar(-b - Math.sqrt(disc)));
      else p = o.clone().add(d.clone().multiplyScalar(-b)).normalize().multiplyScalar(R);
    } else { // plane through the handle, facing the camera
      const n = this.camera.getWorldDirection(new THREE.Vector3());
      const q = h.mesh.position; const s = n.dot(q.clone().sub(o)) / n.dot(d);
      p = o.clone().add(d.clone().multiplyScalar(s));
    }
    h.onDrag([p.x, p.y, p.z]);
    this.dirty = true;
  }
  addHandle(mesh, { mode = 'sphere', radius = 1, onDrag, onStart, onEnd }) {
    const h = { mesh, mode, radius, onDrag, onStart, onEnd };
    this.handles.push(h);
    return () => { this.handles = this.handles.filter((x) => x !== h); };
  }
  // ---------- labels ----------
  addLabel(htmlText, pos, cls = '') {
    const elx = document.createElement('span'); elx.className = 'lbl ' + cls; elx.innerHTML = htmlText;
    this.labelLayer.append(elx);
    const lab = { el: elx, pos: typeof pos === 'function' ? pos : () => pos };
    this.labels.push(lab);
    return { el: elx, setPos: (p) => { lab.pos = typeof p === 'function' ? p : () => p; this.dirty = true; }, setText: (t) => { elx.innerHTML = t; }, remove: () => { elx.remove(); this.labels = this.labels.filter((l) => l !== lab); } };
  }
  _updateLabels() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const tmp = new THREE.Vector3();
    for (const l of this.labels) {
      const p = l.pos(); if (!p) { l.el.style.display = 'none'; continue; }
      tmp.set(p[0], p[1], p[2]).project(this.camera);
      if (tmp.z > 1) { l.el.style.display = 'none'; continue; }
      l.el.style.display = '';
      l.el.style.transform = `translate(-50%,-50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
    }
  }
  // ---------- builders (all added to this.root; clear() removes everything) ----------
  _mat(color, opts = {}) { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.55, metalness: 0.05, ...opts }); return m; }
  makeArrow({ color, radius = 0.03, head = 0.17, headRadius = 2.8, opacity = 1 } = {}) {
    const g = new THREE.Group();
    const mat = this._mat(color, opacity < 1 ? { transparent: true, opacity } : {});
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 20), mat);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * headRadius, head, 24), mat);
    g.add(shaft, cone); this.root.add(g);
    let cur = [0, 0, 0];
    const api = {
      obj: g, mat,
      get: () => cur.slice(),
      set: (v) => {
        cur = v.slice();
        const len = Math.hypot(v[0], v[1], v[2]);
        if (len < 1e-4) { g.visible = false; this.dirty = true; return; }
        g.visible = true;
        g.quaternion.setFromUnitVectors(Y, v3(v).multiplyScalar(1 / len));
        const hl = Math.min(head, len * 0.6), sl = len - hl;
        shaft.scale.set(1, Math.max(sl, 1e-4), 1); shaft.position.y = sl / 2;
        cone.scale.set(1, hl / head, 1); cone.position.y = sl + hl / 2;
        this.dirty = true;
      },
      setColor: (c) => { mat.color.set(c); this.dirty = true; },
      setVisible: (b) => { g.visible = b; this.dirty = true; },
    };
    api.set([0, 0, 1e-5]);
    return api;
  }
  makeSegment({ color, dashed = false, opacity = 1, dash = 0.06, gap = 0.04 } = {}) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color: new THREE.Color(color), dashSize: dash, gapSize: gap, transparent: opacity < 1, opacity })
      : new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity });
    const line = new THREE.Line(geom, mat); line.frustumCulled = false;
    this.root.add(line);
    return {
      obj: line, mat,
      set: (a, b) => {
        const p = geom.attributes.position; p.setXYZ(0, a[0], a[1], a[2]); p.setXYZ(1, b[0], b[1], b[2]); p.needsUpdate = true;
        if (dashed) line.computeLineDistances();
        this.dirty = true;
      },
      setVisible: (v) => { line.visible = v; this.dirty = true; },
      setColor: (c) => { mat.color.set(c); this.dirty = true; },
    };
  }
  makeSphereHandle({ color, radius = 0.06 } = {}) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), this._mat(color));
    this.root.add(m);
    return m;
  }
  makeSphere({ opacity = 0.16, grid = true } = {}) {
    const c = colors();
    const geom = new THREE.SphereGeometry(1, 96, 64);
    const n = geom.attributes.position.count;
    geom.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false, roughness: 0.9, metalness: 0, vertexColors: false });
    const mesh = new THREE.Mesh(geom, mat); mesh.renderOrder = 2;
    const g = new THREE.Group(); g.add(mesh);
    let lines = null;
    if (grid) {
      const pts = [];
      const seg = 72;
      for (let lat = -60; lat <= 60; lat += 30) { const r = Math.cos((lat * Math.PI) / 180), z = Math.sin((lat * Math.PI) / 180);
        for (let i = 0; i < seg; i++) { const a = (i / seg) * 2 * Math.PI, b = ((i + 1) / seg) * 2 * Math.PI; pts.push(r * Math.cos(a), r * Math.sin(a), z, r * Math.cos(b), r * Math.sin(b), z); } }
      for (let lon = 0; lon < 180; lon += 30) { const a0 = (lon * Math.PI) / 180;
        for (let i = 0; i < seg; i++) { const a = (i / seg) * 2 * Math.PI, b = ((i + 1) / seg) * 2 * Math.PI;
          pts.push(Math.sin(a) * Math.cos(a0), Math.sin(a) * Math.sin(a0), Math.cos(a), Math.sin(b) * Math.cos(a0), Math.sin(b) * Math.sin(a0), Math.cos(b)); } }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(c.grid), transparent: true, opacity: 0.9 }));
      lines.renderOrder = 1; g.add(lines);
      this.themed.push(() => lines.material.color.set(colors().grid));
    }
    this.root.add(g);
    const baseOpacity = opacity;
    const tmpColor = new THREE.Color();
    let fade = 1, colored = 0;
    const applyOpacity = () => { mat.opacity = (colored || baseOpacity) * fade; if (lines) lines.material.opacity = 0.9 * fade; this.dirty = true; };
    return {
      obj: g, mesh,
      // fade in/out everything (0..1) without losing the base opacity
      setFade: (t) => { fade = t; applyOpacity(); },
      // fn(x,y,z) -> [r,g,b] in 0..255 (sRGB); null restores the plain sphere
      colorBy: (fn, op = 0.9) => {
        if (!fn) { mat.vertexColors = false; colored = 0; mat.needsUpdate = true; applyOpacity(); return; }
        const P = geom.attributes.position, C = geom.attributes.color;
        for (let i = 0; i < n; i++) {
          const rgb = fn(P.getX(i), P.getY(i), P.getZ(i));
          tmpColor.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
          C.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
        }
        C.needsUpdate = true; mat.vertexColors = true; colored = op; mat.needsUpdate = true; applyOpacity();
      },
      setVisible: (v) => { g.visible = v; this.dirty = true; },
      setGridVisible: (v) => { if (lines) lines.visible = v; this.dirty = true; },
    };
  }
  makePoints(points, { color, size = 0.045 } = {}) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(color), size, sizeAttenuation: true });
    const pts = new THREE.Points(geom, mat); pts.frustumCulled = false;
    this.root.add(pts);
    return {
      obj: pts,
      set: (arr) => { const P = geom.attributes.position; arr.forEach((p, i) => P.setXYZ(i, p[0], p[1], p[2])); P.needsUpdate = true; this.dirty = true; },
      setVisible: (v) => { pts.visible = v; this.dirty = true; },
    };
  }
  makeRing({ color, radius = 1, normal = [0, 0, 1], opacity = 0.8, segments = 96 } = {}) {
    const pts = [];
    for (let i = 0; i <= segments; i++) { const a = (i / segments) * 2 * Math.PI; pts.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0)); }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity }));
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v3(normal).normalize());
    this.root.add(line);
    return { obj: line, setNormal: (nrm) => { line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v3(nrm).normalize()); this.dirty = true; }, setVisible: (v) => { line.visible = v; this.dirty = true; } };
  }
  applyTheme() { for (const f of this.themed) f(); this.dirty = true; }
  // Remove all chapter content.
  clear() {
    for (const t of this.tickers) this.tickers.delete(t);
    this.handles = []; this.themed = [];
    for (const l of this.labels) l.el.remove();
    this.labels = [];
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { [].concat(o.material).forEach((m) => m.dispose()); } });
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this._drag = null; this._orbiting = null;
    this.dirty = true;
  }
}
export { THREE };
