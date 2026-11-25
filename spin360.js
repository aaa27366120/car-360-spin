/*!
 * Spin360: a zero-dependency 360° product viewer web component.
 * https://github.com/ahmettasdemirusa/spin360 · MIT License · Ahmet Tasdemir
 *
 *   <script type="module" src="spin360.js"></script>
 *   <spin-360 src="frames/{i}.webp" frames="36" pad="2" alt="Red mug"></spin-360>
 */

// ---- pure helpers (exported for tests and advanced use) ---------------------------

/** Wrap any integer onto 0..n-1. */
export function wrap(i, n) {
  return ((Math.round(i) % n) + n) % n;
}

/** Clamp onto 0..n-1, for viewers that don't loop. */
export function clamp(i, n) {
  return Math.max(0, Math.min(n - 1, Math.round(i)));
}

/** Frame index to the rotation angle in degrees. */
export function angleOf(i, n) {
  return Math.round((i / n) * 360);
}

/** Frames moved by a horizontal drag: dragging the full width turns the product once. */
export function framesFromDrag(dx, width, frames, speed = 1) {
  if (!width) return 0;
  return (dx / width) * frames * speed;
}

/** Expand a URL pattern such as "img/{i}.webp" for frame i, zero-padded to `pad` digits. */
export function frameUrl(pattern, i, pad = 0) {
  return pattern.replace(/\{i\}/g, String(i).padStart(pad, '0'));
}

/** Source rectangle of frame i inside a sprite sheet laid out in `columns` columns. */
export function spriteRect(i, columns, cellW, cellH) {
  return { x: (i % columns) * cellW, y: Math.floor(i / columns) * cellH, w: cellW, h: cellH };
}

// ---- the element ------------------------------------------------------------------

const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

const STYLE = `
:host { display: block; position: relative; aspect-ratio: var(--spin360-aspect, 1); cursor: grab;
  touch-action: pan-y; user-select: none; -webkit-user-select: none; outline: none; }
:host(:focus-visible) { box-shadow: 0 0 0 3px var(--spin360-focus, #1a73e8); border-radius: 8px; }
:host([dragging]) { cursor: grabbing; }
canvas { width: 100%; height: 100%; display: block; }
.bar { position: absolute; left: 20%; right: 20%; bottom: 12px; height: 3px; border-radius: 3px;
  background: rgba(0,0,0,.12); overflow: hidden; transition: opacity .3s; }
.bar i { display: block; height: 100%; width: 0; background: var(--spin360-accent, #1a73e8); transition: width .15s; }
.hint { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); pointer-events: none;
  font: 600 13px/1 system-ui, sans-serif; color: var(--spin360-hint-color, #333); background: var(--spin360-hint-bg, rgba(255,255,255,.85));
  padding: 8px 12px; border-radius: 999px; box-shadow: 0 2px 10px rgba(0,0,0,.08); transition: opacity .4s; white-space: nowrap; }
.hidden { opacity: 0; }
.err { position: absolute; inset: 0; display: grid; place-items: center; font: 14px system-ui, sans-serif; color: #b3261e; }
`;

export class Spin360 extends Base {
  static get observedAttributes() {
    return ['src', 'sprite', 'frames', 'columns', 'pad', 'autoplay', 'speed', 'alt'];
  }

  constructor() {
    super();
    this._frame = 0;
    this._pos = 0;          // fractional frame position while dragging / coasting
    this._images = [];
    this._loaded = 0;
    this._raf = 0;
    this._playing = false;
    this._touched = false;
    this._gen = 0;          // increments on every reload so stale loads are ignored
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style><canvas part="canvas"></canvas>
      <div class="bar" part="progress"><i></i></div>
      <div class="hint hidden" part="hint">⟷ Drag to rotate</div>`;
    this._canvas = root.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._bar = root.querySelector('.bar');
    this._barFill = root.querySelector('.bar i');
    this._hint = root.querySelector('.hint');
  }

  // -- attributes ------------------------------------------------------------------
  get frames() { return Math.max(1, parseInt(this.getAttribute('frames'), 10) || 36); }
  get loop() { return !this.hasAttribute('no-loop'); }
  get direction() { return this.hasAttribute('reverse') ? -1 : 1; }
  get speed() { return parseFloat(this.getAttribute('speed')) || 12; }        // autoplay, frames per second
  get dragSpeed() { return parseFloat(this.getAttribute('drag-speed')) || 1; }
  get frame() { return this._frame; }
  set frame(i) { this.goTo(i); }

  connectedCallback() {
    this._ready = true;
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.setAttribute('role', 'slider');
    this.setAttribute('aria-valuemin', '0');
    this._syncAria();
    this._frame = this._pos = this._fit(parseInt(this.getAttribute('start'), 10) || 0);

    this._onDown = (e) => this._pointerDown(e);
    this._onKey = (e) => this._key(e);
    this.addEventListener('pointerdown', this._onDown);
    this.addEventListener('keydown', this._onKey);

    this._resizeObs = new ResizeObserver(() => this._resize());
    this._resizeObs.observe(this);

    if (this.hasAttribute('eager') || !('IntersectionObserver' in window)) {
      this._load();
    } else {
      this._io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { this._io.disconnect(); this._load(); }
      }, { rootMargin: '200px' });
      this._io.observe(this);
    }
  }

  disconnectedCallback() {
    this._ready = false;
    this.pause();
    cancelAnimationFrame(this._raf);
    this._resizeObs && this._resizeObs.disconnect();
    this._io && this._io.disconnect();
    this.removeEventListener('pointerdown', this._onDown);
    this.removeEventListener('keydown', this._onKey);
  }

  attributeChangedCallback(name, oldV, newV) {
    // Attributes present at upgrade time fire before connectedCallback; the first load happens there.
    if (oldV === newV || !this._ready) return;
    if (name === 'alt') return this._syncAria();
    if (name === 'autoplay' || name === 'speed') return this._maybeAutoplay();
    // src, sprite, frames, columns, pad: a new image set (e.g. another colorway). Keep the angle.
    const angle = this._frame / (this._images.length || this.frames);
    this._frame = this._pos = this._fit(Math.round(angle * this.frames));
    this._load();
  }

  // -- loading -------------------------------------------------------------------------
  _load() {
    const gen = ++this._gen;
    const sprite = this.getAttribute('sprite');
    const src = this.getAttribute('src');
    const n = this.frames;
    this._loaded = 0;
    this._bar.classList.remove('hidden');
    this._barFill.style.width = '0';
    this._syncAria();

    const done = (img) => {
      if (gen !== this._gen) return;
      this._loaded++;
      this._barFill.style.width = (100 * this._loaded / this._images.length) + '%';
      if (sprite || img === this._images[this._frame]) {
        this._size(img);
        this._draw();
      }
      if (this._loaded === this._images.length) {
        this._bar.classList.add('hidden');
        if (!this._touched && !this.hasAttribute('no-hint')) this._hint.classList.remove('hidden');
        this.dispatchEvent(new CustomEvent('spin360:load', { detail: { frames: n } }));
        this._maybeAutoplay();
      }
    };
    const fail = (url) => {
      if (gen !== this._gen) return;
      this.dispatchEvent(new CustomEvent('spin360:error', { detail: { url } }));
      if (!this.shadowRoot.querySelector('.err')) {
        const el = document.createElement('div');
        el.className = 'err';
        el.textContent = 'Image failed to load';
        this.shadowRoot.appendChild(el);
      }
    };
    const make = (url) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => done(img);
      img.onerror = () => fail(url);
      img.src = url;
      return img;
    };

    if (sprite) {
      this._sheet = make(sprite);
      this._images = [this._sheet];
    } else if (src) {
      const pad = parseInt(this.getAttribute('pad'), 10) || 0;
      // Start frame first so something appears immediately, then the rest in order.
      const order = [this._frame, ...Array.from({ length: n }, (_, i) => i).filter((i) => i !== this._frame)];
      this._images = new Array(n);
      order.forEach((i) => { this._images[i] = make(frameUrl(src, i, pad)); });
    }
  }

  _cell() {
    if (!this._sheet || !this._sheet.naturalWidth) return null;
    const cols = parseInt(this.getAttribute('columns'), 10) || Math.ceil(Math.sqrt(this.frames));
    const rows = Math.ceil(this.frames / cols);
    return { cols, w: this._sheet.naturalWidth / cols, h: this._sheet.naturalHeight / rows };
  }

  _size(img) {
    const c = this._cell();
    const w = c ? c.w : img.naturalWidth, h = c ? c.h : img.naturalHeight;
    if (w && h) this.style.setProperty('--spin360-aspect', `${w} / ${h}`);
    this._resize();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.clientWidth * dpr), h = Math.round(this.clientHeight * dpr);
    if (w && h && (this._canvas.width !== w || this._canvas.height !== h)) {
      this._canvas.width = w;
      this._canvas.height = h;
      this._draw();
    }
  }

  _draw() {
    const ctx = this._ctx, cw = this._canvas.width, ch = this._canvas.height;
    const c = this._cell();
    let img = c ? this._sheet : this._images[this._frame];
    if (!img || !img.complete || !img.naturalWidth) {
      // Frame not ready yet: keep showing whatever is on the canvas.
      return;
    }
    ctx.clearRect(0, 0, cw, ch);
    if (c) {
      const r = spriteRect(this._frame, c.cols, c.w, c.h);
      ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, cw, ch);
    } else {
      ctx.drawImage(img, 0, 0, cw, ch);
    }
  }

  // -- navigation ------------------------------------------------------------------------
  _fit(i) { return this.loop ? wrap(i, this.frames) : clamp(i, this.frames); }

  goTo(i) {
    const next = this._fit(i);
    this._pos = i;
    if (next === this._frame) return;
    this._frame = next;
    this._draw();
    this._syncAria();
    this.dispatchEvent(new CustomEvent('spin360:change', { detail: { frame: next, angle: angleOf(next, this.frames) } }));
  }

  next() { this.goTo(this._frame + 1); }
  prev() { this.goTo(this._frame - 1); }

  play() {
    if (this._playing) return;
    this._playing = true;
    let last = performance.now(), acc = 0;
    const tick = (t) => {
      if (!this._playing) return;
      acc += ((t - last) / 1000) * this.speed;
      last = t;
      if (acc >= 1) {
        const step = Math.floor(acc);
        acc -= step;
        if (!this.loop && this._frame + step > this.frames - 1) return this.pause();
        this.goTo(this._frame + step);
      }
      this._playRaf = requestAnimationFrame(tick);
    };
    this._playRaf = requestAnimationFrame(tick);
  }

  pause() {
    this._playing = false;
    cancelAnimationFrame(this._playRaf);
  }

  _maybeAutoplay() {
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ready = this._images.length > 0 && this._loaded === this._images.length;
    if (this.hasAttribute('autoplay') && !this._touched && !reduced && ready) this.play();
    else if (!this.hasAttribute('autoplay')) this.pause();
  }

  _interacted() {
    this._touched = true;
    this.pause();
    cancelAnimationFrame(this._raf); // stop any coasting from an earlier flick
    this._hint.classList.add('hidden');
  }

  _syncAria() {
    this.setAttribute('aria-label', this.getAttribute('alt') || '360° product view');
    this.setAttribute('aria-valuemax', String(this.frames - 1));
    this.setAttribute('aria-valuenow', String(this._frame));
    this.setAttribute('aria-valuetext', `${angleOf(this._frame, this.frames)}°`);
  }

  // -- input ---------------------------------------------------------------------------------
  _pointerDown(e) {
    if (e.button !== 0) return;
    this._interacted();
    cancelAnimationFrame(this._raf);
    this.setPointerCapture(e.pointerId);
    this.setAttribute('dragging', '');
    const startX = e.clientX, startPos = this._frame;
    let lastX = e.clientX, lastT = e.timeStamp, vel = 0; // frames per millisecond

    const move = (ev) => {
      const d = framesFromDrag(ev.clientX - startX, this.clientWidth, this.frames, this.dragSpeed) * this.direction;
      const dt = ev.timeStamp - lastT;
      if (dt > 0) {
        const v = framesFromDrag(ev.clientX - lastX, this.clientWidth, this.frames, this.dragSpeed) * this.direction / dt;
        vel = vel * 0.6 + v * 0.4;
      }
      lastX = ev.clientX; lastT = ev.timeStamp;
      this.goTo(startPos + d);
    };
    const up = (ev) => {
      this.removeEventListener('pointermove', move);
      this.removeEventListener('pointerup', up);
      this.removeEventListener('pointercancel', up);
      this.removeAttribute('dragging');
      if (ev.timeStamp - lastT < 80 && !this.hasAttribute('no-inertia')) this._coast(vel);
    };
    this.addEventListener('pointermove', move);
    this.addEventListener('pointerup', up);
    this.addEventListener('pointercancel', up);
  }

  // Keep turning after a flick, slowing down smoothly.
  _coast(vel) {
    let pos = this._pos, last = performance.now();
    const step = (t) => {
      const dt = t - last;
      last = t;
      pos += vel * dt;
      vel *= Math.pow(0.994, dt);
      this.goTo(pos);
      if (Math.abs(vel) > 0.002) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  _key(e) {
    const big = Math.max(1, Math.round(this.frames / 8));
    const map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: big, PageDown: -big };
    if (e.key in map) { this._interacted(); this.goTo(this._frame + map[e.key] * this.direction); }
    else if (e.key === 'Home') { this._interacted(); this.goTo(0); }
    else if (e.key === 'End') { this._interacted(); this.goTo(this.frames - 1); }
    else if (e.key === ' ') { this._playing ? this.pause() : this.play(); }
    else return;
    e.preventDefault();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('spin-360')) {
  customElements.define('spin-360', Spin360);
}
