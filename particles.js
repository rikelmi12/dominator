// DOMINATOR - Enhanced Dynamic Particle and Visual FX Engine

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.decals = []; // Lingering blood, scorch marks, craters
        this.ambientParticles = [];
        this.slashArcs = []; // Dynamic sword slashes
        this.speedLines = [];
        this.initAmbient();
    }

    initAmbient(theme = 'valley') {
        this.ambientParticles = [];
        this.theme = theme;
        const count = 130;

        for (let i = 0; i < count; i++) {
            let color = '#5fb85f';
            let type = 'leaf';
            let vy = 0.3 + Math.random() * 0.9;
            let vx = 0.8 + Math.random() * 1.6;

            if (theme === 'frost') {
                type = Math.random() > 0.4 ? 'snow' : 'ice_mote';
                color = Math.random() > 0.5 ? '#ffffff' : '#bde0fe';
                vy = 0.8 + Math.random() * 1.4;
                vx = (Math.random() - 0.2) * 1.2;
            } else if (theme === 'volcano') {
                type = Math.random() > 0.4 ? 'ember' : 'ash';
                color = Math.random() > 0.5 ? '#ff5400' : (Math.random() > 0.5 ? '#ffd000' : '#8d99ae');
                vy = -(0.6 + Math.random() * 1.5); // Rising embers
                vx = (Math.random() - 0.5) * 1.5;
            } else {
                type = Math.random() > 0.4 ? 'leaf' : 'mote';
                color = Math.random() > 0.5 ? '#e29547' : (Math.random() > 0.5 ? '#5fb85f' : '#00e5ff');
            }

            this.ambientParticles.push({
                x: Math.random() * 5000,
                y: Math.random() * 3400,
                vx, vy,
                size: 2 + Math.random() * 3.5,
                type,
                color,
                swayOffset: Math.random() * Math.PI * 2,
                opacity: 0.3 + Math.random() * 0.5
            });
        }
    }

    add(p) {
        this.particles.push({
            x: p.x,
            y: p.y,
            vx: p.vx || (Math.random() - 0.5) * 4,
            vy: p.vy || (Math.random() - 0.5) * 4,
            life: p.life || 1,
            maxLife: p.life || 1,
            size: p.size || 4,
            endSize: p.endSize !== undefined ? p.endSize : 0,
            color: p.color || '#ffcc00',
            alpha: p.alpha || 1,
            decay: p.decay || 0.02,
            type: p.type || 'circle',
            gravity: p.gravity || 0,
            drag: p.drag || 0.98,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.2
        });
    }

    addSlashArc(x, y, angle, radius, color = '#00e5ff', sweep = 1.6) {
        this.slashArcs.push({
            x, y, angle, radius, color, sweep,
            life: 1.0,
            decay: 0.08
        });
    }

    addDecal(x, y, radius, type = 'scorch', color = 'rgba(20, 15, 15, 0.65)') {
        this.decals.push({
            x, y, radius, type, color,
            alpha: 0.85,
            life: 1.0,
            decay: 0.003 // Decals linger a long time
        });
        if (this.decals.length > 70) {
            this.decals.shift();
        }
    }

    addFloatingText(x, y, text, color = '#ffffff', size = 16, isCrit = false) {
        this.floatingTexts.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 10,
            vy: -2.4,
            text: text,
            color: color,
            size: isCrit ? size * 1.35 : size,
            life: 1.0,
            maxLife: 1.0,
            isCrit: isCrit,
            scale: 0.5
        });
    }

    createSparks(x, y, color = '#ffaa33', count = 12, speed = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.5 + Math.random() * 0.8) * speed;
            this.add({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: 3 + Math.random() * 2.5,
                endSize: 0.5,
                color: color,
                decay: 0.035 + Math.random() * 0.03,
                life: 1.0,
                drag: 0.93
            });
        }
    }

    createBlood(x, y, count = 10) {
        this.addDecal(x, y, 12 + Math.random() * 8, 'blood', Math.random() > 0.5 ? '#7a0a0a' : '#550505');
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.6 + Math.random() * 1.8) * 3.5;
            this.add({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: 3.5 + Math.random() * 2.5,
                endSize: 1,
                color: Math.random() > 0.5 ? '#c1121f' : '#780000',
                decay: 0.028,
                gravity: 0.08,
                drag: 0.92
            });
        }
    }

    createExplosion(x, y, radius = 95) {
        this.addDecal(x, y, radius * 0.75, 'scorch', 'rgba(15, 10, 10, 0.75)');

        // Blinding shockwave ring
        this.add({
            x, y,
            vx: 0, vy: 0,
            size: 15,
            endSize: radius * 1.3,
            color: '#fff275',
            decay: 0.06,
            type: 'shockwave'
        });

        // Fiery center burst
        for (let i = 0; i < 48; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * (radius * 0.1);
            const colors = ['#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0'];
            this.add({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: 8 + Math.random() * 16,
                endSize: 0,
                color: colors[Math.floor(Math.random() * colors.length)],
                decay: 0.02 + Math.random() * 0.025,
                drag: 0.92
            });
        }

        // Rising smoke clouds
        for (let i = 0; i < 28; i++) {
            const angle = (i / 28) * Math.PI * 2;
            const spd = radius * 0.045 + Math.random() * 2.5;
            this.add({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 0.8,
                size: 18 + Math.random() * 14,
                endSize: 32,
                color: 'rgba(50, 45, 45, 0.45)',
                decay: 0.012,
                drag: 0.94
            });
        }
    }

    createAuraRing(x, y, color = '#ffd700', radius = 60) {
        const count = 32;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.add({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
                vx: Math.cos(angle) * 1.8,
                vy: Math.sin(angle) * 1.8 - 0.5,
                size: 4 + Math.random() * 3.5,
                color: color,
                decay: 0.032,
                drag: 0.95
            });
        }
    }

    triggerSpeedLines(heroX, heroY, angle) {
        for (let i = 0; i < 18; i++) {
            const perp = angle + Math.PI / 2;
            const offset = (Math.random() - 0.5) * 80;
            this.speedLines.push({
                x: heroX + Math.cos(perp) * offset - Math.cos(angle) * 40,
                y: heroY + Math.sin(perp) * offset - Math.sin(angle) * 40,
                vx: Math.cos(angle) * (14 + Math.random() * 8),
                vy: Math.sin(angle) * (14 + Math.random() * 8),
                length: 40 + Math.random() * 30,
                alpha: 1.0,
                decay: 0.06
            });
        }
    }

    update(dt) {
        // Ambient particles
        for (let p of this.ambientParticles) {
            p.swayOffset += 0.05;
            p.x += p.vx + Math.sin(p.swayOffset) * 0.6;
            p.y += p.vy;
            if (p.x > 4000) p.x = 0;
            if (p.y > 3000) p.y = 0;
        }

        // Sword slash arcs
        for (let i = this.slashArcs.length - 1; i >= 0; i--) {
            const sa = this.slashArcs[i];
            sa.life -= sa.decay;
            if (sa.life <= 0) {
                this.slashArcs.splice(i, 1);
            }
        }

        // Decals fading out very slowly
        for (let i = this.decals.length - 1; i >= 0; i--) {
            const d = this.decals[i];
            d.life -= d.decay * dt * 10;
            if (d.life <= 0) {
                this.decals.splice(i, 1);
            }
        }

        // Speed lines
        for (let i = this.speedLines.length - 1; i >= 0; i--) {
            const sl = this.speedLines[i];
            sl.x += sl.vx;
            sl.y += sl.vy;
            sl.alpha -= sl.decay;
            if (sl.alpha <= 0) {
                this.speedLines.splice(i, 1);
            }
        }

        // Active particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.rotation += p.vRot;
        }

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= 0.022;
            ft.y += ft.vy;
            ft.vy *= 0.94;
            if (ft.scale < 1.0) ft.scale = Math.min(1.0, ft.scale + 0.15);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    drawDecals(ctx, camera) {
        // Draw Scorch Marks & Blood Pools onto the ground
        for (let d of this.decals) {
            if (camera.isVisible(d.x, d.y, d.radius)) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, d.life * d.alpha);
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
                ctx.fillStyle = d.color;
                ctx.fill();
                ctx.restore();
            }
        }
    }

    draw(ctx, camera) {
        // 1. Slash Arcs (Glowing blade sweeps)
        for (let sa of this.slashArcs) {
            if (camera.isVisible(sa.x, sa.y, sa.radius + 30)) {
                ctx.save();
                ctx.translate(sa.x, sa.y);
                ctx.rotate(sa.angle);
                ctx.globalAlpha = sa.life;
                ctx.strokeStyle = sa.color;
                ctx.shadowColor = sa.color;
                ctx.shadowBlur = 18;
                ctx.lineWidth = 9 * sa.life;
                ctx.beginPath();
                ctx.arc(0, 0, sa.radius, -sa.sweep / 2, sa.sweep / 2);
                ctx.stroke();

                // Inner white-hot blade core
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3 * sa.life;
                ctx.beginPath();
                ctx.arc(0, 0, sa.radius, -sa.sweep / 2, sa.sweep / 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 2. Speed Lines
        for (let sl of this.speedLines) {
            ctx.save();
            ctx.globalAlpha = sl.alpha;
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x - sl.vx * 2, sl.y - sl.vy * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Ambient particles (Leaves, spores)
        for (let p of this.ambientParticles) {
            if (camera.isVisible(p.x, p.y, p.size)) {
                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                if (p.type === 'leaf') {
                    ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.8, p.swayOffset, 0, Math.PI * 2);
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                }
                ctx.fill();
                ctx.restore();
            }
        }

        // 4. Standard particles & Shockwaves
        for (let p of this.particles) {
            if (camera.isVisible(p.x, p.y, p.size)) {
                ctx.save();
                const progress = 1 - (p.life / p.maxLife);
                const currentSize = p.size + (p.endSize - p.size) * progress;
                ctx.globalAlpha = Math.max(0, p.life * p.alpha);

                if (p.type === 'shockwave') {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 6 * p.life;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(0.5, currentSize), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // 5. Floating texts with pop-in bounce animation
        for (let ft of this.floatingTexts) {
            if (camera.isVisible(ft.x, ft.y, 60)) {
                ctx.save();
                ctx.translate(ft.x, ft.y);
                ctx.scale(ft.scale, ft.scale);
                ctx.globalAlpha = Math.min(1, ft.life * 1.4);
                ctx.font = `${ft.isCrit ? '900' : 'bold'} ${ft.size}px 'Cinzel', 'Segoe UI', sans-serif`;
                ctx.textAlign = 'center';

                // Shadow outline
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
                ctx.lineWidth = ft.isCrit ? 5 : 3.5;
                ctx.strokeText(ft.text, 0, 0);

                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, 0, 0);
                ctx.restore();
            }
        }
    }
}
