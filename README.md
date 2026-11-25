<div align="center">

# 🔄 Spin360

**A zero-dependency 360° product viewer web component. One HTML tag, under 5 KB gzipped.**

Drag, swipe or use the keyboard to turn a product around: inertia, autoplay, lazy loading and sprite sheets included. Works with any framework, or none.

[![Live demo](https://img.shields.io/badge/▶_Live_demo-try_it-e4572e?style=for-the-badge)](https://ahmettasdemirusa.github.io/spin360/)

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![Size](https://img.shields.io/badge/gzipped-%3C5_KB-blue)
![Web Component](https://img.shields.io/badge/web_component-%3Cspin--360%3E-orange)

<a href="https://ahmettasdemirusa.github.io/spin360/"><img src="docs/demo.gif" width="360" alt="A ceramic mug turning 360 degrees in the Spin360 viewer"></a>

</div>

---

## Quick start

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/ahmettasdemirusa/spin360@v1.0.0/spin360.js"></script>

<spin-360 src="/images/mug/{i}.webp" frames="36" pad="2" alt="Ceramic mug"></spin-360>
```

- `{i}` is replaced by the frame number, and `pad="2"` zero-pads it (`00` … `35`).
- The viewer fills its container's width and takes its aspect ratio from your images.
- No build step, no framework, no dependencies. It works in React, Vue, Svelte, WordPress, Shopify themes or plain HTML.

## Features

- 🖱️ **Drag, swipe and flick** with pointer events and natural inertia; vertical page scrolling still works on phones
- ⌨️ **Accessible:** a focusable `role="slider"` that announces the angle, with full keyboard control
- 🎞️ **Autoplay** that stops on the first interaction and respects `prefers-reduced-motion`
- 💤 **Lazy loading:** frames load only when the viewer approaches the viewport, starting with the visible frame
- 🧩 **Sprite sheets:** all frames in one image and one request
- 🎨 **Colorways:** swap the `src` attribute and the current angle is kept
- 📐 **Crisp on retina** (canvas rendering capped at 2× DPR) and responsive with `ResizeObserver`
- 🪶 **Tiny:** one ES module, under 5 KB gzipped, including its comments

## Attributes

| Attribute | Default | Description |
|---|---|---|
| `src` | | URL pattern for the frames; `{i}` is the frame number |
| `pad` | `0` | Zero-pad the frame number to this many digits |
| `sprite` | | A single sprite-sheet image instead of separate files |
| `columns` | `√frames` | Columns in the sprite sheet |
| `frames` | `36` | Number of frames |
| `start` | `0` | First frame to show |
| `autoplay` | off | Turn automatically until the user interacts |
| `speed` | `12` | Autoplay speed in frames per second |
| `drag-speed` | `1` | Drag sensitivity; `1` means one full turn per viewer width |
| `reverse` | off | Invert the drag and arrow-key direction |
| `no-loop` | off | Stop at the first and last frame instead of wrapping |
| `no-inertia` | off | Disable coasting after a flick |
| `no-hint` | off | Hide the "Drag to rotate" hint |
| `eager` | off | Load immediately instead of lazily |
| `alt` | "360° product view" | Accessible label |

## JavaScript API

```js
const viewer = document.querySelector('spin-360');

viewer.goTo(9);                 // jump to frame 9
viewer.next(); viewer.prev();   // step one frame
viewer.play(); viewer.pause();  // autoplay control
viewer.frame;                   // current frame (read/write)

viewer.addEventListener('spin360:change', (e) => console.log(e.detail.frame, e.detail.angle));
viewer.addEventListener('spin360:load',   (e) => console.log('ready', e.detail.frames));
viewer.addEventListener('spin360:error',  (e) => console.warn('missing', e.detail.url));

// Show another colorway; the angle is kept.
viewer.setAttribute('src', '/images/mug-blue/{i}.webp');
```

The frame math helpers are exported too: `wrap`, `clamp`, `angleOf`, `framesFromDrag`, `frameUrl` and `spriteRect`.

## Keyboard

| Key | Action |
|---|---|
| ← → ↑ ↓ | Rotate one frame |
| Page Up / Page Down | Rotate ⅛ of a turn |
| Home / End | First / last frame |
| Space | Play / pause |

## Styling

```css
spin-360 {
  --spin360-accent: #e4572e;   /* loading bar */
  --spin360-focus: #1a73e8;    /* keyboard focus ring */
  --spin360-hint-bg: #fff;
  --spin360-hint-color: #333;
}
spin-360::part(hint) { font-size: 12px; }
```

Parts: `canvas`, `progress`, `hint`.

## Making the frames

Shoot or render the product at even steps. 24–36 frames look smooth; 72 look silky.

- **Photos:** use a turntable and a fixed camera. Keep the lighting and framing identical, and crop every frame to the same size.
- **3D renders:** this repo's demo mug is rendered with three.js by [`tools/render.py`](tools/render.py), which outputs 36 WebP frames plus a sprite sheet. Adapt it to your own model.
- **Format:** WebP at quality 75–85 keeps 36 frames of a 600 px product to roughly 200–250 KB.

## Browser support

Any modern browser with Custom Elements, Shadow DOM, Pointer Events and `ResizeObserver`: current Chrome, Edge, Firefox and Safari, on desktop and mobile.

## Development

```bash
node --test              # unit tests for the frame math
python tools/render.py   # re-render the demo frames (needs Chrome and Pillow)
```

## 3D Web series

Three projects that work together:

| | |
|---|---|
| 🔄 **Spin360** | 360° product viewer web component (this repo) |
| 🧊 **[Three.js Product Skills](https://github.com/ahmettasdemirusa/threejs-product-skills)** | Teach AI coding agents to build 3D product viewers, configurators and 360° spins |
| 🌐 **[Awesome 3D Web](https://github.com/ahmettasdemirusa/awesome-3d-web)** | A curated list of libraries, tools and resources for 3D on the web |

## License

[MIT](LICENSE) © Ahmet Tasdemir

---

<div align="center">

If Spin360 is useful to you, a ⭐ helps other people find it.

Built by **[Ahmet Tasdemir](https://github.com/ahmettasdemirusa)**, software engineer · [ahmettasdemir.com](https://ahmettasdemir.com)

More open source: 📍 [Local SEO toolkit](https://github.com/ahmettasdemirusa/local-seo-skills) · 🧊 [3D Web series](https://github.com/ahmettasdemirusa/spin360) · [all projects](https://github.com/ahmettasdemirusa)

</div>
