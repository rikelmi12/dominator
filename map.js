// DOMINATOR - Multi-Map Engine: 3 Massive Battlegrounds (4800x3200)

class CapturePoint {
    constructor(id, name, x, y, initialOwner = 'neutral', icon = '⚔️') {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.radius = 180;
        this.owner = initialOwner;
        this.progress = initialOwner === 'player' ? 100 : (initialOwner === 'enemy' ? -100 : 0);
        this.capturingFaction = null;
        this.isContested = false;
        this.icon = icon;
        this.turretCooldown = 0;
        this.runeAngle = 0;
        this.pulse = 0;
        this.lightIntensity = 1.0;
    }

    update(dt, entities, soundManager, particleSystem) {
        this.runeAngle += 0.018;
        this.pulse += 0.045;
        this.lightIntensity = 0.8 + Math.sin(this.pulse) * 0.2;

        let playerCount = 0;
        let enemyCount = 0;

        for (let e of entities) {
            if (!e.isDead) {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist <= this.radius) {
                    if (e.faction === 'player') playerCount += (e.isHero ? 2.5 : 1);
                    if (e.faction === 'enemy') enemyCount += (e.isHero ? 2.5 : 1);
                }
            }
        }

        const prevOwner = this.owner;

        if (playerCount > 0 && enemyCount > 0) {
            this.isContested = true;
            this.capturingFaction = null;
        } else if (playerCount > 0) {
            this.isContested = false;
            this.capturingFaction = 'player';
            const rate = 14 * Math.min(4, playerCount) * dt;
            this.progress = Math.min(100, this.progress + rate);
            if (this.progress >= 100) {
                this.owner = 'player';
            }
        } else if (enemyCount > 0) {
            this.isContested = false;
            this.capturingFaction = 'enemy';
            const rate = 14 * Math.min(4, enemyCount) * dt;
            this.progress = Math.max(-100, this.progress - rate);
            if (this.progress <= -100) {
                this.owner = 'enemy';
            }
        } else {
            this.isContested = false;
            this.capturingFaction = null;
        }

        if (this.owner !== prevOwner) {
            if (this.owner === 'player') {
                soundManager.captureHorn(true);
                particleSystem.createAuraRing(this.x, this.y, '#00e5ff', 165);
                particleSystem.addFloatingText(this.x, this.y - 65, `★ ${this.name} CONQUISTADO!`, '#00e5ff', 24, true);
            } else if (this.owner === 'enemy') {
                soundManager.captureHorn(false);
                particleSystem.createAuraRing(this.x, this.y, '#ff3344', 165);
                particleSystem.addFloatingText(this.x, this.y - 65, `⚠ ${this.name} PERDIDO!`, '#ff3344', 24, true);
            }
        }

        if (this.owner !== 'neutral') {
            this.turretCooldown -= dt;
            if (this.turretCooldown <= 0) {
                const targetFaction = this.owner === 'player' ? 'enemy' : 'player';
                let nearest = null;
                let minDist = 370;
                for (let e of entities) {
                    if (!e.isDead && e.faction === targetFaction) {
                        const d = Math.hypot(e.x - this.x, e.y - this.y);
                        if (d < minDist) {
                            minDist = d;
                            nearest = e;
                        }
                    }
                }

                if (nearest) {
                    this.turretCooldown = 1.45;
                    soundManager.turretLaser();
                    const turretDamage = 40;
                    nearest.takeDamage(turretDamage, this.owner, particleSystem, soundManager, 'Torre');

                    const steps = 18;
                    const color = this.owner === 'player' ? '#00e5ff' : '#ff2a2a';
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        particleSystem.add({
                            x: this.x + (nearest.x - this.x) * t,
                            y: (this.y - 45) + ((nearest.y - 20) - (this.y - 45)) * t,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: (Math.random() - 0.5) * 1.5,
                            size: 3.5,
                            color: color,
                            decay: 0.08,
                            life: 0.6
                        });
                    }
                }
            }
        }
    }

    draw(ctx, camera) {
        if (!camera.isVisible(this.x, this.y, this.radius + 60)) return;

        ctx.save();

        let primaryColor = '#8892b0';
        let glowColor = 'rgba(136, 146, 176, 0.15)';
        if (this.owner === 'player') {
            primaryColor = '#00d2ff';
            glowColor = 'rgba(0, 210, 255, 0.22)';
        } else if (this.owner === 'enemy') {
            primaryColor = '#ff2a55';
            glowColor = 'rgba(255, 42, 85, 0.22)';
        }

        const zoneGrad = ctx.createRadialGradient(this.x, this.y, 25, this.x, this.y, this.radius);
        zoneGrad.addColorStop(0, glowColor);
        zoneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = zoneGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 4;
        ctx.strokeStyle = primaryColor;
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const runeCount = 8;
        for (let i = 0; i < runeCount; i++) {
            const angle = this.runeAngle + (i / runeCount) * Math.PI * 2;
            const rx = this.x + Math.cos(angle) * (this.radius - 16);
            const ry = this.y + Math.sin(angle) * (this.radius - 16);
            ctx.fillStyle = primaryColor;
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#161b24';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2d3748';
        ctx.stroke();

        const floatY = this.y - 45 + Math.sin(this.pulse * 1.5) * 6;
        ctx.save();
        ctx.translate(this.x, floatY);
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 24 * this.lightIntensity;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 24);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(this.x, this.y, 46, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        let progNorm = (this.progress + 100) / 200;
        let startAngle = -Math.PI / 2;
        let endAngle = startAngle + (Math.PI * 2 * progNorm);

        ctx.beginPath();
        ctx.arc(this.x, this.y, 46, startAngle, endAngle);
        ctx.lineWidth = 7;
        ctx.strokeStyle = this.progress > 0 ? '#00e5ff' : (this.progress < 0 ? '#ff2a55' : '#8892b0');
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.stroke();

        const badgeY = this.y - 82;
        ctx.font = 'bold 13px "Cinzel", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';

        const text = `${this.icon} ${this.name}`;
        const metrics = ctx.measureText(text);
        const boxWidth = metrics.width + 24;

        ctx.fillStyle = 'rgba(10, 15, 25, 0.88)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.x - boxWidth / 2, badgeY - 14, boxWidth, 24, 6);
        } else {
            ctx.rect(this.x - boxWidth / 2, badgeY - 14, boxWidth, 24);
        }
        ctx.fill();
        ctx.strokeStyle = this.isContested ? '#ffaa00' : primaryColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = this.isContested ? '#ffc83b' : '#ffffff';
        ctx.fillText(this.isContested ? `⚔️ ${this.name} (EM DISPUTA)` : text, this.x, badgeY + 3);

        ctx.restore();
    }
}

class GameMap {
    constructor(theme = 'valley') {
        this.width = 4800; // Massive battlefield width
        this.height = 3200; // Massive battlefield height
        this.theme = theme; // 'valley', 'frost', 'volcano'
        this.capturePoints = [];
        this.sceneryDecorations = [];
        this.riverPoints = [];
        this.roads = [];
        this.bridges = [];
        this.waterTime = 0;
        this.loadTheme(theme);
    }

    loadTheme(theme) {
        this.theme = theme;
        this.capturePoints = [];
        this.sceneryDecorations = [];
        this.roads = [];
        this.riverPoints = [];
        this.bridges = [];

        if (theme === 'frost') {
            this.initFrostMap();
        } else if (theme === 'volcano') {
            this.initVolcanoMap();
        } else {
            this.initValleyMap();
        }
    }

    initValleyMap() {
        // MAP 1: VALE DA AURORA (Forest, Rivers, 6 Big Checkpoints)
        this.terrainBase = '#162218';
        this.terrainTile = '#1a291d';
        this.roadColor = '#3a3024';
        this.roadCobble = '#483c2e';
        this.riverColor = '#143142';
        this.riverWave = '#1f5370';
        this.riverFoam = 'rgba(130, 210, 255, 0.35)';

        this.capturePoints = [
            new CapturePoint(1, 'Forte Imperial', 650, 1600, 'player', '🛡️'),
            new CapturePoint(2, 'Vila dos Bosques', 1600, 750, 'neutral', '🌲'),
            new CapturePoint(3, 'Altar Central das Runas', 2400, 1600, 'neutral', '🔮'),
            new CapturePoint(4, 'Posto da Colina', 3200, 2450, 'neutral', '⛰️'),
            new CapturePoint(5, 'Mina da Floresta', 1600, 2450, 'neutral', '⛏️'),
            new CapturePoint(6, 'Cidadela Carmesim', 4150, 1600, 'enemy', '🏰')
        ];

        this.roads = [
            { from: this.capturePoints[0], to: this.capturePoints[1] },
            { from: this.capturePoints[0], to: this.capturePoints[4] },
            { from: this.capturePoints[1], to: this.capturePoints[2] },
            { from: this.capturePoints[4], to: this.capturePoints[2] },
            { from: this.capturePoints[2], to: this.capturePoints[3] },
            { from: this.capturePoints[2], to: this.capturePoints[5] },
            { from: this.capturePoints[3], to: this.capturePoints[5] }
        ];

        this.riverPoints = [
            { x: 2400, y: 0 },
            { x: 2200, y: 700 },
            { x: 2600, y: 1200 },
            { x: 2300, y: 2000 },
            { x: 2500, y: 2700 },
            { x: 2400, y: 3200 }
        ];

        this.bridges = [
            { x: 2400, y: 1600, width: 240, height: 120, angle: 0 },
            { x: 2240, y: 750, width: 160, height: 80, angle: 0.15 },
            { x: 2380, y: 2450, width: 160, height: 80, angle: -0.15 }
        ];

        this.populateScenery(['oak', 'pine', 'rock', 'ruins', 'torch'], 300);
    }

    initFrostMap() {
        // MAP 2: PICOS DA GEADA (Frozen Tundra, Ice Rivers, 6 Checkpoints)
        this.terrainBase = '#131b26';
        this.terrainTile = '#182433';
        this.roadColor = '#243345';
        this.roadCobble = '#2f4258';
        this.riverColor = '#102538';
        this.riverWave = '#1c4263';
        this.riverFoam = 'rgba(180, 230, 255, 0.45)';

        this.capturePoints = [
            new CapturePoint(1, 'Castelo do Inverno', 650, 1600, 'player', '❄️'),
            new CapturePoint(2, 'Caverna dos Ventos', 1700, 750, 'neutral', '🏔️'),
            new CapturePoint(3, 'Santuário Glacial', 2400, 1600, 'neutral', '💎'),
            new CapturePoint(4, 'Templo Congelado', 3100, 750, 'neutral', '⛩️'),
            new CapturePoint(5, 'Posto das Geadas', 2400, 2500, 'neutral', '🧊'),
            new CapturePoint(6, 'Fortaleza da Neve', 4150, 1600, 'enemy', '💀')
        ];

        this.roads = [
            { from: this.capturePoints[0], to: this.capturePoints[1] },
            { from: this.capturePoints[0], to: this.capturePoints[4] },
            { from: this.capturePoints[1], to: this.capturePoints[2] },
            { from: this.capturePoints[4], to: this.capturePoints[2] },
            { from: this.capturePoints[2], to: this.capturePoints[3] },
            { from: this.capturePoints[3], to: this.capturePoints[5] },
            { from: this.capturePoints[4], to: this.capturePoints[5] }
        ];

        this.riverPoints = [
            { x: 2400, y: 0 },
            { x: 2600, y: 800 },
            { x: 2250, y: 1400 },
            { x: 2550, y: 2200 },
            { x: 2400, y: 3200 }
        ];

        this.bridges = [
            { x: 2400, y: 1600, width: 250, height: 120, angle: 0 },
            { x: 2550, y: 800, width: 160, height: 80, angle: 0.1 },
            { x: 2350, y: 2400, width: 160, height: 80, angle: -0.1 }
        ];

        this.populateScenery(['pine', 'ice_rock', 'ice_ruins', 'torch'], 290);
    }

    initVolcanoMap() {
        // MAP 3: FORJA VULCÂNICA (Molten Magma, Obsidian, 6 Checkpoints)
        this.terrainBase = '#151010';
        this.terrainTile = '#1a1313';
        this.roadColor = '#2b1d1d';
        this.roadCobble = '#3b2626';
        this.riverColor = '#801800'; // Molten lava river
        this.riverWave = '#c42800';
        this.riverFoam = 'rgba(255, 170, 0, 0.55)'; // Yellow magma foam

        this.capturePoints = [
            new CapturePoint(1, 'Bastião de Ferro', 650, 1600, 'player', '🛡️'),
            new CapturePoint(2, 'Cratera Escaldante', 1650, 800, 'neutral', '🔥'),
            new CapturePoint(3, 'Altar da Forja Central', 2400, 1600, 'neutral', '🌋'),
            new CapturePoint(4, 'Mina de Obsidiana', 3150, 2400, 'neutral', '💎'),
            new CapturePoint(5, 'Forja dos Titãs', 1650, 2400, 'neutral', '⚒️'),
            new CapturePoint(6, 'Fortaleza de Magma', 4150, 1600, 'enemy', '👹')
        ];

        this.roads = [
            { from: this.capturePoints[0], to: this.capturePoints[1] },
            { from: this.capturePoints[0], to: this.capturePoints[4] },
            { from: this.capturePoints[1], to: this.capturePoints[2] },
            { from: this.capturePoints[4], to: this.capturePoints[2] },
            { from: this.capturePoints[2], to: this.capturePoints[3] },
            { from: this.capturePoints[3], to: this.capturePoints[5] },
            { from: this.capturePoints[2], to: this.capturePoints[5] }
        ];

        this.riverPoints = [
            { x: 2400, y: 0 },
            { x: 2150, y: 900 },
            { x: 2650, y: 1500 },
            { x: 2200, y: 2300 },
            { x: 2400, y: 3200 }
        ];

        this.bridges = [
            { x: 2400, y: 1600, width: 250, height: 120, angle: 0 },
            { x: 2200, y: 850, width: 160, height: 80, angle: 0.15 },
            { x: 2300, y: 2350, width: 160, height: 80, angle: -0.15 }
        ];

        this.populateScenery(['burnt_tree', 'rock', 'volcano_spire', 'torch'], 300);
    }

    populateScenery(types, count) {
        let seed = 101;
        const random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        for (let i = 0; i < count; i++) {
            const x = 120 + random() * (this.width - 240);
            const y = 120 + random() * (this.height - 240);

            let tooClose = false;
            for (let cp of this.capturePoints) {
                if (Math.hypot(x - cp.x, y - cp.y) < cp.radius + 40) {
                    tooClose = true;
                    break;
                }
            }

            if (Math.abs(x - 2400) < 160 && Math.abs(y - 1600) < 300) {
                tooClose = true;
            }

            if (!tooClose) {
                const type = types[Math.floor(random() * types.length)];
                this.sceneryDecorations.push({
                    x, y,
                    type,
                    size: 22 + random() * 28,
                    variant: Math.floor(random() * 3),
                    swayOffset: random() * Math.PI * 2
                });
            }
        }

        this.sceneryDecorations.sort((a, b) => a.y - b.y);
    }

    update(dt, entities, soundManager, particleSystem) {
        this.waterTime += dt * 2.5;
        for (let cp of this.capturePoints) {
            cp.update(dt, entities, soundManager, particleSystem);
        }
    }

    draw(ctx, camera) {
        // Base terrain
        ctx.fillStyle = this.terrainBase;
        ctx.fillRect(camera.x, camera.y, camera.width, camera.height);

        // Ground grid tiles
        const tileSize = 200;
        const startX = Math.floor(camera.x / tileSize) * tileSize;
        const endX = camera.x + camera.width + tileSize;
        const startY = Math.floor(camera.y / tileSize) * tileSize;
        const endY = camera.y + camera.height + tileSize;

        ctx.fillStyle = this.terrainTile;
        for (let x = startX; x < endX; x += tileSize) {
            for (let y = startY; y < endY; y += tileSize) {
                if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
                    ctx.fillRect(x, y, tileSize, tileSize);
                }
            }
        }

        // Roads
        for (let r of this.roads) {
            ctx.strokeStyle = this.roadColor;
            ctx.lineWidth = 76;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(r.from.x, r.from.y);
            ctx.lineTo(r.to.x, r.to.y);
            ctx.stroke();

            ctx.strokeStyle = this.roadCobble;
            ctx.lineWidth = 44;
            ctx.beginPath();
            ctx.moveTo(r.from.x, r.from.y);
            ctx.lineTo(r.to.x, r.to.y);
            ctx.stroke();
        }

        // River (Water, Ice, or Lava)
        ctx.save();
        ctx.lineWidth = 150;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.riverColor;
        ctx.beginPath();
        ctx.moveTo(this.riverPoints[0].x, this.riverPoints[0].y);
        for (let i = 1; i < this.riverPoints.length; i++) {
            ctx.lineTo(this.riverPoints[i].x, this.riverPoints[i].y);
        }
        ctx.stroke();

        ctx.lineWidth = 85;
        ctx.strokeStyle = this.riverWave;
        ctx.stroke();

        ctx.lineWidth = 16;
        ctx.strokeStyle = this.riverFoam;
        ctx.lineDashOffset = -this.waterTime * 28;
        ctx.setLineDash([28, 22]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Bridges
        for (let b of this.bridges) {
            if (camera.isVisible(b.x, b.y, b.width)) {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle);

                ctx.fillStyle = '#262d36';
                ctx.fillRect(-b.width / 2 - 12, -b.height / 2, 24, b.height);
                ctx.fillRect(b.width / 2 - 12, -b.height / 2, 24, b.height);

                ctx.fillStyle = this.theme === 'volcano' ? '#3d2522' : '#4d3929';
                ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);

                ctx.fillStyle = '#2a1e16';
                ctx.fillRect(-b.width / 2, -b.height / 2, b.width, 10);
                ctx.fillRect(-b.width / 2, b.height / 2 - 10, b.width, 10);
                ctx.restore();
            }
        }

        // Capture Checkpoints
        for (let cp of this.capturePoints) {
            cp.draw(ctx, camera);
        }

        // Scenery props
        const time = Date.now() * 0.003;
        for (let deco of this.sceneryDecorations) {
            if (camera.isVisible(deco.x, deco.y, deco.size + 45)) {
                ctx.save();
                ctx.translate(deco.x, deco.y);

                if (deco.type === 'oak') {
                    ctx.fillStyle = 'rgba(8, 12, 10, 0.5)';
                    ctx.beginPath();
                    ctx.ellipse(8, 14, deco.size * 0.95, deco.size * 0.52, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#382415';
                    ctx.beginPath();
                    ctx.arc(0, 0, deco.size * 0.28, 0, Math.PI * 2);
                    ctx.fill();

                    const sway = Math.sin(time + deco.swayOffset) * 2.8;
                    ctx.fillStyle = deco.variant === 0 ? '#1b4324' : (deco.variant === 1 ? '#23532c' : '#173c1f');
                    ctx.beginPath();
                    ctx.arc(sway, -deco.size * 0.6, deco.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (deco.type === 'pine') {
                    ctx.fillStyle = 'rgba(8, 12, 10, 0.5)';
                    ctx.beginPath();
                    ctx.ellipse(6, 10, deco.size * 0.75, deco.size * 0.42, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const sway = Math.sin(time + deco.swayOffset) * 2;
                    ctx.fillStyle = this.theme === 'frost' ? '#1c3445' : '#11301e';
                    ctx.beginPath();
                    ctx.moveTo(sway, -deco.size * 1.6);
                    ctx.lineTo(deco.size * 0.75, 0);
                    ctx.lineTo(-deco.size * 0.75, 0);
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = this.theme === 'frost' ? '#e2f1fc' : '#18432a';
                    ctx.beginPath();
                    ctx.moveTo(sway, -deco.size * 1.9);
                    ctx.lineTo(deco.size * 0.55, -deco.size * 0.5);
                    ctx.lineTo(-deco.size * 0.55, -deco.size * 0.5);
                    ctx.closePath();
                    ctx.fill();
                } else if (deco.type === 'burnt_tree') {
                    ctx.fillStyle = '#1c1616';
                    ctx.fillRect(-4, -deco.size * 1.2, 8, deco.size * 1.2);
                    ctx.fillRect(-12, -deco.size * 0.8, 24, 5);
                } else if (deco.type === 'rock' || deco.type === 'ice_rock') {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                    ctx.beginPath();
                    ctx.ellipse(4, 5, deco.size * 0.65, deco.size * 0.42, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = deco.type === 'ice_rock' ? '#334e68' : '#3c4650';
                    ctx.beginPath();
                    ctx.arc(0, 0, deco.size * 0.52, 0, Math.PI * 2);
                    ctx.fill();
                } else if (deco.type === 'torch') {
                    ctx.fillStyle = '#2e1f10';
                    ctx.fillRect(-3, -22, 6, 26);

                    const flamePulse = 0.8 + Math.sin(time * 9 + deco.x) * 0.2;
                    ctx.fillStyle = this.theme === 'frost' ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 140, 20, 0.25)';
                    ctx.beginPath();
                    ctx.arc(0, -24, 65 * flamePulse, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = this.theme === 'frost' ? '#00e5ff' : '#ff6b00';
                    ctx.beginPath();
                    ctx.arc(0, -24, 7 * flamePulse, 0, Math.PI * 2);
                    ctx.fill();
                } else if (deco.type === 'ruins' || deco.type === 'ice_ruins' || deco.type === 'volcano_spire') {
                    ctx.fillStyle = '#222830';
                    ctx.fillRect(-16, -26, 11, 32);
                    ctx.fillRect(9, -20, 11, 25);
                    ctx.fillStyle = '#343c48';
                    ctx.fillRect(-20, -34, 42, 9);
                }

                ctx.restore();
            }
        }

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 14;
        ctx.strokeRect(0, 0, this.width, this.height);
    }

    drawLighting(ctx, camera, player, entities) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';

        const baseAmbient = this.theme === 'volcano' ? 'rgba(20, 10, 10, 0.45)' : (this.theme === 'frost' ? 'rgba(10, 18, 28, 0.42)' : 'rgba(12, 16, 24, 0.42)');
        ctx.fillStyle = baseAmbient;
        ctx.fillRect(camera.x, camera.y, camera.width, camera.height);

        ctx.globalCompositeOperation = 'lighter';

        if (!player.isDead) {
            const playerLight = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 230);
            playerLight.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
            playerLight.addColorStop(0.5, 'rgba(0, 150, 255, 0.15)');
            playerLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = playerLight;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 230, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let cp of this.capturePoints) {
            if (camera.isVisible(cp.x, cp.y, 260)) {
                const color = cp.owner === 'player' ? 'rgba(0, 229, 255, 0.4)' : (cp.owner === 'enemy' ? 'rgba(255, 42, 85, 0.4)' : 'rgba(180, 200, 230, 0.25)');
                const crystalLight = ctx.createRadialGradient(cp.x, cp.y, 15, cp.x, cp.y, 260);
                crystalLight.addColorStop(0, color);
                crystalLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = crystalLight;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y, 260, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const time = Date.now() * 0.003;
        for (let deco of this.sceneryDecorations) {
            if (deco.type === 'torch' && camera.isVisible(deco.x, deco.y, 150)) {
                const flicker = 0.85 + Math.sin(time * 9 + deco.x) * 0.15;
                const torchLight = ctx.createRadialGradient(deco.x, deco.y - 24, 8, deco.x, deco.y - 24, 140 * flicker);
                const col = this.theme === 'frost' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 150, 30, 0.35)';
                torchLight.addColorStop(0, col);
                torchLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = torchLight;
                ctx.beginPath();
                ctx.arc(deco.x, deco.y - 24, 140 * flicker, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
