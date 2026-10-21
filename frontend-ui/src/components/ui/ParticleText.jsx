// frontend-ui/src/components/ui/ParticleText.jsx
import React, { useEffect, useRef } from 'react';
import './ParticleText.css';

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};

const mixRgb = (from, to, amount) => ({
  r: Math.round(from.r + (to.r - from.r) * amount),
  g: Math.round(from.g + (to.g - from.g) * amount),
  b: Math.round(from.b + (to.b - from.b) * amount)
});

const rgbToCss = (rgb) => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const resolveFontSize = (value, container, fontWeight, fontFamily) => {
  if (typeof value === 'number') return value;

  const probe = document.createElement('span');
  probe.textContent = 'M';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.fontSize = value;
  probe.style.fontWeight = String(fontWeight);
  probe.style.fontFamily = fontFamily;
  container.appendChild(probe);
  const size = parseFloat(window.getComputedStyle(probe).fontSize) || 96;
  probe.remove();
  return size;
};

const waitForFonts = async (font) => {
  if (!('fonts' in document)) return;
  try {
    await document.fonts.load(font);
  } catch {}
  await document.fonts.ready;
};

export default function ParticleText({
  text = 'AQUILA',
  shape = 'text', // 'text' | 'drop'
  particleSize = 3,
  density = 3,
  color = '#ffffff',
  highlightColor = '#38bdf8',
  scatter = 100,
  gatherDuration = 1200,
  stagger = 200,
  pointerRepel = 40,
  repelRadius = 70,
  idleDrift = 0.5,
  trigger = 'none',
  fitContainer = false,
  fontSize = '24px',
  fontWeight = 900,
  fontFamily = 'inherit',
  glow = false,
  className = '',
  style
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let particles = [];
    let animationFrame = null;
    let resizeFrame = null;
    let buildId = 0;
    let gathering = false;
    let gatherStart = 0;
    let reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const pointer = {
      active: false,
      x: 0,
      y: 0,
      smoothX: 0,
      smoothY: 0
    };

    const startGather = (fromScatter = true) => {
      if (!particles.length) return;
      const now = performance.now();
      const spread = reducedMotion ? 0 : scatter;

      particles.forEach(particle => {
        if (fromScatter) {
          const angle = particle.seed * Math.PI * 2;
          const distance = spread * (0.35 + particle.depth * 0.75);
          particle.x = particle.targetX + Math.cos(angle) * distance + (particle.depth - 0.5) * spread * 0.55;
          particle.y = particle.targetY + Math.sin(angle) * distance + (particle.seed - 0.5) * spread * 0.55;
        }

        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.delay = reducedMotion ? 0 : particle.seed * stagger;
      });

      gatherStart = now;
      gathering = true;
    };

    const drawParticle = particle => {
      const size = particle.size;
      ctx.fillStyle = particle.color;

      if (size <= 2.1) {
        ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
        return;
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = now => {
      ctx.clearRect(0, 0, width, height);

      if (glow && !reducedMotion) {
        ctx.shadowBlur = particleSize * 2.5;
        ctx.shadowColor = highlightColor;
      } else {
        ctx.shadowBlur = 0;
      }

      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;

      let complete = true;

      particles.forEach(particle => {
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;

        if (gathering) {
          const local = (now - gatherStart - particle.delay) / Math.max(1, reducedMotion ? 1 : gatherDuration);
          progress = clamp(local, 0, 1);
          const eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        } else if (!reducedMotion && idleDrift > 0) {
          const driftTime = now * 0.001;
          baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * idleDrift * particle.depth;
          baseY += Math.cos(driftTime * 0.75 + particle.depth * 10) * idleDrift * particle.depth;
        }

        if (pointer.active && !reducedMotion && pointerRepel > 0 && repelRadius > 0) {
          const dx = baseX - pointer.smoothX;
          const dy = baseY - pointer.smoothY;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < repelRadius) {
            const force = Math.pow(1 - distance / repelRadius, 2) * pointerRepel;
            baseX += (dx / distance) * force;
            baseY += (dy / distance) * force;
          }
        }

        const follow = reducedMotion ? 1 : 0.22;
        particle.x += (baseX - particle.x) * follow;
        particle.y += (baseY - particle.y) * follow;

        ctx.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1);
        drawParticle(particle);
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (gathering && complete) {
        gathering = false;
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    const ensureRenderLoop = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const sampleContent = async () => {
      const currentBuild = ++buildId;
      const rect = container.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      if (shape === 'drop') {
        offscreen.width = width;
        offscreen.height = height;
        offCtx.clearRect(0, 0, width, height);

        // Scaled down: tighter teardrop with breathing room
        const cx = width / 2;
        const topY = height * 0.22;
        const bottomY = height * 0.78;
        const r = (bottomY - topY) * 0.32;
        const cy = bottomY - r;

        offCtx.beginPath();
        offCtx.moveTo(cx, topY);
        offCtx.bezierCurveTo(cx - r * 0.35, cy - r * 0.5, cx - r, cy - r * 0.2, cx - r, cy);
        offCtx.arc(cx, cy, r, Math.PI, 0, true);
        offCtx.bezierCurveTo(cx + r, cy - r * 0.2, cx + r * 0.35, cy - r * 0.5, cx, topY);
        offCtx.closePath();
        offCtx.fillStyle = '#ffffff';
        offCtx.fill();
      } else {
        // Standard typography sampling
        const computed = window.getComputedStyle(container);
        const resolvedFamily = fontFamily === 'inherit' ? computed.fontFamily || 'sans-serif' : fontFamily;
        let resolvedSize = resolveFontSize(fontSize, container, fontWeight, resolvedFamily);
        let font = `${fontWeight} ${resolvedSize}px ${resolvedFamily}`;

        await waitForFonts(font);
        if (currentBuild !== buildId) return;

        const rawContent = String(text || ' ');
        const lines = rawContent.split('\n');

        offCtx.font = font;
        const maxTextWidth = width * 0.88;
        const maxTextHeight = height * 0.88;

        let measuredLineWidths = lines.map(line => offCtx.measureText(line).width);
        let maxLineWidth = Math.max(1, ...measuredLineWidths);
        let lineHeight = resolvedSize * 0.86;
        let totalCalculatedHeight = (lines.length - 1) * lineHeight + resolvedSize;

        const scaleX = maxTextWidth / maxLineWidth;
        const scaleY = maxTextHeight / totalCalculatedHeight;
        const fitScale = fitContainer ? Math.min(scaleX, scaleY) : Math.min(scaleX, scaleY, 1);

        if (fitScale !== 1) {
          resolvedSize = Math.max(14, Math.floor(resolvedSize * fitScale));
          lineHeight = resolvedSize * 0.86;
          font = `${fontWeight} ${resolvedSize}px ${resolvedFamily}`;
          await waitForFonts(font);
          if (currentBuild !== buildId) return;
          offCtx.font = font;
          measuredLineWidths = lines.map(line => offCtx.measureText(line).width);
          maxLineWidth = Math.max(1, ...measuredLineWidths);
        }

        const padding = Math.max(8, Math.ceil(resolvedSize * 0.08));
        const textWidth = Math.ceil(maxLineWidth);
        const ascent = Math.ceil(resolvedSize * 0.78);
        const descent = Math.ceil(resolvedSize * 0.22);
        const totalBlockHeight = Math.ceil((lines.length - 1) * lineHeight + ascent + descent);

        offscreen.width = textWidth + padding * 2;
        offscreen.height = totalBlockHeight + padding * 2;
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.font = font;
        offCtx.textAlign = 'left';
        offCtx.textBaseline = 'alphabetic';
        offCtx.fillStyle = '#ffffff';

        lines.forEach((line, index) => {
          const lineWidth = offCtx.measureText(line).width;
          const xPos = padding + (textWidth - lineWidth) / 2;
          const yPos = padding + ascent + index * lineHeight;
          offCtx.fillText(line, xPos, yPos);
        });
      }

      const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
      const targets = [];
      const step = Math.max(2, Math.floor(density));

      for (let y = 0; y < offscreen.height; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
          if (alpha > 40) {
            targets.push({
              x: width / 2 - offscreen.width / 2 + x,
              y: height / 2 - offscreen.height / 2 + y,
              alpha: alpha / 255
            });
          }
        }
      }

      const maxParticles = Math.max(800, Math.min(3000, Math.floor((width * height) / 120)));
      const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      const baseRgb = hexToRgb(color);
      const highlightRgb = hexToRgb(highlightColor);
      const selected = targets.filter((_, index) => index % stride === 0);

      particles = selected.map((target, index) => {
        const seed = ((index * 9301 + 49297) % 233280) / 233280;
        const depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
        const blend = baseRgb && highlightRgb ? clamp(target.y / Math.max(1, height) + (seed - 0.5) * 0.35, 0, 1) : 0;
        const particleColor = baseRgb && highlightRgb ? rgbToCss(mixRgb(baseRgb, highlightRgb, blend)) : color;
        const angle = seed * Math.PI * 2;
        const distance = (reducedMotion ? 0 : scatter) * (0.35 + depth * 0.75);
        const startX = target.x + Math.cos(angle) * distance;
        const startY = target.y + Math.sin(angle) * distance;

        return {
          x: reducedMotion ? target.x : startX,
          y: reducedMotion ? target.y : startY,
          startX,
          startY,
          targetX: target.x,
          targetY: target.y,
          size: Math.max(0.8, particleSize * (0.75 + target.alpha * 0.45)),
          color: particleColor,
          seed,
          depth,
          delay: seed * stagger
        };
      });

      pointer.x = width / 2;
      pointer.y = height / 2;
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;

      if (reducedMotion) {
        particles.forEach(p => {
          p.x = p.targetX;
          p.y = p.targetY;
        });
        gathering = false;
      } else {
        startGather(false);
      }

      ensureRenderLoop();
    };

    const queueSample = () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(sampleContent);
    };

    const handlePointerMove = event => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseleave', handlePointerLeave);

    const resizeObserver = new ResizeObserver(queueSample);
    resizeObserver.observe(container);
    sampleContent();

    return () => {
      buildId += 1;
      resizeObserver.disconnect();
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mouseleave', handlePointerLeave);

      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    };
  }, [
    text,
    shape,
    particleSize,
    density,
    color,
    highlightColor,
    scatter,
    gatherDuration,
    stagger,
    pointerRepel,
    repelRadius,
    idleDrift,
    trigger,
    fitContainer,
    fontSize,
    fontWeight,
    fontFamily,
    glow
  ]);

  return (
    <div ref={containerRef} className={`particle-text ${className}`} style={style}>
      <canvas ref={canvasRef} className="particle-text__canvas" aria-hidden="true" />
      <span className="particle-text__sr">{shape === 'drop' ? 'Aquila Water Drop' : text}</span>
    </div>
  );
}