/**
 * hero-canvas.js
 * Animated constellation/network hero background for CDE client proposals.
 * Drop in a <canvas id="hero-canvas"></canvas> and include this script.
 * Pure vanilla JS — no dependencies, no modules.
 *
 * Core Digital Expansion | 2026
 */

var HERO_CONFIG = {
  // Colors — swap these per client
  colors: {
    bg: '#0a0a12',
    nodes: ['#005ccf', '#7dd3e8', '#6bc4a6'],
    lines: 'rgba(125, 211, 232, 0.12)',
    glowColor: 'rgba(0, 92, 207, 0.3)',
    meshColors: ['#005ccf', '#7dd3e8', '#6bc4a6']
  },
  // Particles
  nodeCount: 80,
  nodeMinSize: 1.5,
  nodeMaxSize: 4,
  connectionDistance: 150,
  // Animation
  speed: 0.5,
  meshSpeed: 0.0008,
  // Mouse
  mouseRadius: 200,
  mouseForce: 0.02
};

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  // ---------------------------------------------------------------
  // Mesh Blob (background gradient orb)
  // ---------------------------------------------------------------

  function MeshBlob(w, h, color, index, total) {
    var rgb = hexToRgb(color);
    this.rgb = rgb;
    this.baseX = rand(w * 0.15, w * 0.85);
    this.baseY = rand(h * 0.15, h * 0.85);
    this.x = this.baseX;
    this.y = this.baseY;
    this.radius = rand(Math.min(w, h) * 0.25, Math.min(w, h) * 0.45);
    this.opacity = rand(0.12, 0.22);
    // Each blob drifts on its own Lissajous-ish path
    this.freqX = rand(0.4, 1.1);
    this.freqY = rand(0.4, 1.1);
    this.phaseX = rand(0, Math.PI * 2);
    this.phaseY = rand(0, Math.PI * 2);
    this.ampX = rand(w * 0.1, w * 0.22);
    this.ampY = rand(h * 0.1, h * 0.22);
    // Slow morph of radius
    this.radiusFreq = rand(0.3, 0.8);
    this.radiusAmp = this.radius * 0.12;
  }

  MeshBlob.prototype.update = function (t, w, h) {
    var ms = HERO_CONFIG.meshSpeed;
    this.x = this.baseX + Math.sin(t * ms * this.freqX + this.phaseX) * this.ampX;
    this.y = this.baseY + Math.cos(t * ms * this.freqY + this.phaseY) * this.ampY;
    this.currentRadius = this.radius + Math.sin(t * ms * this.radiusFreq) * this.radiusAmp;
  };

  MeshBlob.prototype.draw = function (ctx) {
    var grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.currentRadius);
    grad.addColorStop(0, 'rgba(' + this.rgb.r + ',' + this.rgb.g + ',' + this.rgb.b + ',' + this.opacity + ')');
    grad.addColorStop(0.5, 'rgba(' + this.rgb.r + ',' + this.rgb.g + ',' + this.rgb.b + ',' + (this.opacity * 0.4) + ')');
    grad.addColorStop(1, 'rgba(' + this.rgb.r + ',' + this.rgb.g + ',' + this.rgb.b + ',0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  MeshBlob.prototype.resize = function (w, h, oldW, oldH) {
    var rx = w / (oldW || 1);
    var ry = h / (oldH || 1);
    this.baseX *= rx;
    this.baseY *= ry;
    this.ampX *= rx;
    this.ampY *= ry;
    this.radius *= Math.min(rx, ry);
    this.radiusAmp = this.radius * 0.12;
  };

  // ---------------------------------------------------------------
  // Node (particle)
  // ---------------------------------------------------------------

  function Node(w, h, cfg) {
    // Assign layer: 0 = tiny bg, 1 = medium, 2 = large hero
    var roll = Math.random();
    if (roll < 0.5) {
      this.layer = 0;
    } else if (roll < 0.88) {
      this.layer = 1;
    } else {
      this.layer = 2;
    }

    var minS = cfg.nodeMinSize;
    var maxS = cfg.nodeMaxSize;

    if (this.layer === 0) {
      this.radius = rand(minS, minS + (maxS - minS) * 0.25);
      this.opacity = rand(0.25, 0.5);
      this.speedMult = 0.4;
    } else if (this.layer === 1) {
      this.radius = rand(minS + (maxS - minS) * 0.3, minS + (maxS - minS) * 0.7);
      this.opacity = rand(0.5, 0.8);
      this.speedMult = 0.7;
    } else {
      this.radius = rand(minS + (maxS - minS) * 0.75, maxS);
      this.opacity = rand(0.8, 1.0);
      this.speedMult = 1.0;
    }

    var colors = cfg.colors.nodes;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.rgb = hexToRgb(this.color);

    // Orbital/wandering path — each node has its own unique anchor + orbit
    // This guarantees even spread and perpetual motion (no pooling)
    this.anchorX = rand(0.08, 0.92) * w;
    this.anchorY = rand(0.08, 0.92) * h;
    this.orbitRx = rand(w * 0.04, w * 0.18);
    this.orbitRy = rand(h * 0.04, h * 0.18);
    this.freqX = rand(0.15, 0.5) * this.speedMult;
    this.freqY = rand(0.15, 0.5) * this.speedMult;
    this.phaseX = rand(0, Math.PI * 2);
    this.phaseY = rand(0, Math.PI * 2);

    // Set initial position from orbit
    this.x = this.anchorX;
    this.y = this.anchorY;

    // Mouse displacement (smoothed)
    this.mx = 0;
    this.my = 0;

    // Opacity oscillation
    this.opacityBase = this.opacity;
    this.opacityFreq = rand(0.3, 1.2);
    this.opacityPhase = rand(0, Math.PI * 2);
  }

  Node.prototype.update = function (t, w, h, mx, my, mouseActive, cfg) {
    // Orbital position — smooth, perpetual, never pools
    var speed = cfg.speed * 0.001;
    this.x = this.anchorX + Math.sin(t * speed * this.freqX + this.phaseX) * this.orbitRx;
    this.y = this.anchorY + Math.cos(t * speed * this.freqY + this.phaseY) * this.orbitRy;

    // Mouse repulsion (smoothed displacement)
    if (mouseActive) {
      var dx = this.x - mx;
      var dy = this.y - my;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < cfg.mouseRadius && dist > 0) {
        var force = (1 - dist / cfg.mouseRadius) * 40;
        var layerDampen = this.layer === 0 ? 1.4 : this.layer === 1 ? 1.0 : 0.6;
        this.mx += ((dx / dist) * force * layerDampen - this.mx) * 0.08;
        this.my += ((dy / dist) * force * layerDampen - this.my) * 0.08;
      } else {
        this.mx *= 0.92;
        this.my *= 0.92;
      }
    } else {
      this.mx *= 0.92;
      this.my *= 0.92;
    }

    this.x += this.mx;
    this.y += this.my;

    // Keep within bounds
    this.x = clamp(this.x, 5, w - 5);
    this.y = clamp(this.y, 5, h - 5);

    // Oscillate opacity
    this.opacity = this.opacityBase + Math.sin(t * 0.001 * this.opacityFreq + this.opacityPhase) * 0.12;
    this.opacity = clamp(this.opacity, 0.15, 1.0);
  };

  Node.prototype.draw = function (ctx, cfg) {
    var r = this.rgb;
    var alpha = this.opacity;

    // Glow for medium and large nodes
    if (this.layer >= 1) {
      ctx.save();
      ctx.shadowColor = 'rgba(' + r.r + ',' + r.g + ',' + r.b + ',' + (alpha * 0.5) + ')';
      ctx.shadowBlur = this.layer === 2 ? this.radius * 8 : this.radius * 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r.r + ',' + r.g + ',' + r.b + ',' + alpha + ')';
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r.r + ',' + r.g + ',' + r.b + ',' + alpha + ')';
      ctx.fill();
    }
  };

  // ---------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------

  var canvas, ctx, dpr;
  var W, H; // logical dimensions
  var nodes = [];
  var blobs = [];
  var mouseX = -9999, mouseY = -9999, mouseActive = false;
  var animId = null;
  var startTime = 0;
  var lastW = 0, lastH = 0;
  var activeConnectionDist = HERO_CONFIG.connectionDistance;

  function init() {
    canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    dpr = window.devicePixelRatio || 1;

    resize();
    createBlobs();
    createNodes();

    // Events
    window.addEventListener('resize', debounce(resize, 200));
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibility);

    startTime = performance.now();
    loop();
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  // Scale config values relative to a 1440px baseline
  function getResponsiveScale() {
    var baseline = 1440;
    var size = Math.min(W, H);
    return Math.max(0.5, Math.min(1.2, size / baseline + 0.3));
  }

  function resize() {
    var parent = canvas.parentElement || document.body;
    var rect = parent.getBoundingClientRect ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    var newW = Math.floor(rect.width);
    var newH = Math.floor(rect.height);

    // Fallback if parent has no size
    if (newW < 10) newW = window.innerWidth;
    if (newH < 10) newH = window.innerHeight;

    var oldW = W || newW;
    var oldH = H || newH;
    W = newW;
    H = newH;
    dpr = window.devicePixelRatio || 1;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Responsive scaling — adjust connection distance and node count for screen size
    var scale = getResponsiveScale();
    activeConnectionDist = Math.floor(HERO_CONFIG.connectionDistance * scale);

    // Rebuild nodes/blobs on significant resize (e.g. orientation change)
    var sizeChanged = (oldW !== W || oldH !== H);
    var majorChange = Math.abs(W - oldW) > 200 || Math.abs(H - oldH) > 200;

    if (blobs.length && sizeChanged) {
      for (var i = 0; i < blobs.length; i++) {
        blobs[i].resize(W, H, oldW, oldH);
      }
    }

    // On major resize, rescale node anchors and orbits proportionally
    if (sizeChanged && nodes.length) {
      var rx = W / (oldW || 1);
      var ry = H / (oldH || 1);
      for (var j = 0; j < nodes.length; j++) {
        nodes[j].anchorX *= rx;
        nodes[j].anchorY *= ry;
        nodes[j].orbitRx *= rx;
        nodes[j].orbitRy *= ry;
      }
    }

    // On major resize, also adjust node count
    if (majorChange) {
      var targetCount = Math.max(30, Math.floor(HERO_CONFIG.nodeCount * scale));
      if (Math.abs(targetCount - nodes.length) > 10) {
        nodes = [];
        for (var k = 0; k < targetCount; k++) {
          nodes.push(new Node(W, H, HERO_CONFIG));
        }
      }
    }

    lastW = W;
    lastH = H;
  }

  function createBlobs() {
    var mc = HERO_CONFIG.colors.meshColors;
    blobs = [];
    // 4 blobs cycling through mesh colors
    for (var i = 0; i < 4; i++) {
      blobs.push(new MeshBlob(W, H, mc[i % mc.length], i, 4));
    }
  }

  function createNodes() {
    nodes = [];
    var count = HERO_CONFIG.nodeCount;
    // Use grid-jitter distribution to prevent clumping
    // Calculate a rough grid, then jitter each position randomly
    var cols = Math.ceil(Math.sqrt(count * (W / H)));
    var rows = Math.ceil(count / cols);
    var cellW = W / cols;
    var cellH = H / rows;
    for (var i = 0; i < count; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      // Center of cell + random jitter within 80% of cell
      var cx = (col + 0.5) * cellW;
      var cy = (row + 0.5) * cellH;
      var jitterX = (Math.random() - 0.5) * cellW * 0.8;
      var jitterY = (Math.random() - 0.5) * cellH * 0.8;
      var node = new Node(W, H, HERO_CONFIG);
      // Override the random anchor with grid-jittered position
      node.anchorX = clamp(cx + jitterX, W * 0.05, W * 0.95);
      node.anchorY = clamp(cy + jitterY, H * 0.05, H * 0.95);
      nodes.push(node);
    }
  }

  // Mouse / touch handlers
  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    mouseActive = true;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      var rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
      mouseActive = true;
    }
  }

  function onMouseLeave() {
    mouseActive = false;
  }

  function onVisibility() {
    if (document.hidden) {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    } else {
      if (!animId) {
        startTime = performance.now();
        loop();
      }
    }
  }

  // ---------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------

  function loop() {
    animId = requestAnimationFrame(loop);
    var t = performance.now() - startTime;
    var cfg = HERO_CONFIG;

    // Clear
    ctx.fillStyle = cfg.colors.bg;
    ctx.fillRect(0, 0, W, H);

    // --- Layer 1: Mesh gradient blobs ---
    ctx.globalCompositeOperation = 'lighter';
    for (var b = 0; b < blobs.length; b++) {
      blobs[b].update(t, W, H);
      blobs[b].draw(ctx);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Update nodes
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].update(t, W, H, mouseX, mouseY, mouseActive, cfg);
    }

    // --- Layer 2: Connection lines ---
    drawConnections(cfg);

    // --- Layer 3: Nodes with glow ---
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].draw(ctx, cfg);
    }
  }

  function drawConnections(cfg) {
    var dist = activeConnectionDist;
    var distSq = dist * dist;

    // Parse base line color once
    // cfg.colors.lines = 'rgba(125, 211, 232, 0.12)'
    var lc = cfg.colors.lines;
    // Extract rgb from the rgba string
    var match = lc.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    var lr = match ? parseInt(match[1]) : 125;
    var lg = match ? parseInt(match[2]) : 211;
    var lb = match ? parseInt(match[3]) : 232;

    ctx.lineWidth = 0.6;

    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];

        // Only connect nodes within 1 layer of each other
        if (Math.abs(a.layer - b.layer) > 1) continue;

        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dSq = dx * dx + dy * dy;

        if (dSq < distSq) {
          var d = Math.sqrt(dSq);
          var alpha = (1 - d / dist) * 0.18;
          // Fade more for tiny-layer connections
          if (a.layer === 0 || b.layer === 0) alpha *= 0.5;

          ctx.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
