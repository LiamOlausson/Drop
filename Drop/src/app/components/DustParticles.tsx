// src/app/components/DustParticles.tsx
import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    opacity: number;
    opacityDrift: number;
}

export const DustParticles = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const COUNT = 65;
        const particles: Particle[] = Array.from({ length: COUNT }, () => ({
            x:            Math.random() * window.innerWidth,
            y:            Math.random() * window.innerHeight,
            vx:           (Math.random() - 0.5) * 0.14,
            vy:           -(Math.random() * 0.1 + 0.02), // drift upward slowly
            r:            Math.random() * 2.2 + 0.3,
            opacity:      Math.random() * 0.08 + 0.012,
            opacityDrift: (Math.random() - 0.5) * 0.0008,
        }));

        let rafId: number;

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.opacity += p.opacityDrift;

                // wrap edges
                if (p.x < -4) p.x = canvas.width + 4;
                if (p.x > canvas.width + 4) p.x = -4;
                if (p.y < -4) p.y = canvas.height + 4;

                // drift opacity gently
                if (p.opacity < 0.008 || p.opacity > 0.09) p.opacityDrift *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(240, 200, 130, ${p.opacity})`;
                ctx.fill();
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 0,
            }}
        />
    );
};
