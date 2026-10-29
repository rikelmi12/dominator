// DOMINATOR - Enhanced Game Engine: Dynamic Lighting, Smart Aim Reticle, and Mobile Touch Engine

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
    }

    update(targetX, targetY, mouseWorldX, mouseWorldY, mapWidth, mapHeight, dt) {
        // Smooth camera lerp with lookahead
        const lookAheadX = targetX + (mouseWorldX - targetX) * 0.16;
        const lookAheadY = targetY + (mouseWorldY - targetY) * 0.16;

        const desiredX = lookAheadX - this.width / 2;
        const desiredY = lookAheadY - this.height / 2;

        this.x += (desiredX - this.x) * 8.5 * dt;
        this.y += (desiredY - this.y) * 8.5 * dt;

        this.x = Math.max(0, Math.min(mapWidth - this.width, this.x));
        this.y = Math.max(0, Math.min(mapHeight - this.height, this.y));

        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const shake = this.shakeIntensity * (this.shakeTimer / 0.35);
            this.x += (Math.random() - 0.5) * shake;
            this.y += (Math.random() - 0.5) * shake;
        }

        // Smooth zoom lerp
        this.zoom += (this.targetZoom - this.zoom) * 6 * dt;
    }

    shake(intensity = 12, duration = 0.35) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    isVisible(x, y, radius = 50) {
        return (
            x + radius >= this.x &&
            x - radius <= this.x + this.width &&
            y + radius >= this.y &&
            y - radius <= this.y + this.height
        );
    }
}

class DominatorGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.miniCtx = this.minimapCanvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.map = new GameMap();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.particles = new ParticleSystem();
        this.sound = soundManager;

        // Domination Ticket Score
        this.playerScore = 0;
        this.enemyScore = 0;
        this.targetScore = 1000;
        this.isGameOver = false;

        // Player & Entities (Spawned at Base 1 and Enemy Base)
        const pBase = this.map.capturePoints[0];
        const eBase = this.map.capturePoints[this.map.capturePoints.length - 1];

        this.player = new PlayerHero(pBase.x, pBase.y);
        this.enemyHero = new BaseEntity(eBase.x, eBase.y, 'enemy', 'hero');
        this.enemyHero.damage = 48;
        this.enemyHero.maxHp = 650;
        this.enemyHero.hp = 650;

        this.entities = [this.player, this.enemyHero];
        this.projectiles = [];

        // Wave Timers
        this.spawnTimer = 0;
        this.enemyHeroRespawnTimer = 0;
        this.scoreTickTimer = 0;

        // Inputs
        this.keys = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false };
        this.touchInput = { active: false, dx: 0, dy: 0, aimActive: false, aimAngle: 0 };
        this.reticleAngle = 0;

        this.setupEvents();
        this.setupMobileControls();
        this.initStartingUnits();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    changeMap(theme) {
        this.sound.init();
        this.map.loadTheme(theme);
        this.particles.initAmbient(theme);
        this.playerScore = 0;
        this.enemyScore = 0;
        this.isGameOver = false;

        const pBase = this.map.capturePoints[0];
        const eBase = this.map.capturePoints[this.map.capturePoints.length - 1];

        this.player.x = pBase.x;
        this.player.y = pBase.y;
        this.player.hp = this.player.maxHp;
        this.player.mana = this.player.maxMana;
        this.player.isDead = false;
        this.player.targetDest = null;

        this.enemyHero = new BaseEntity(eBase.x, eBase.y, 'enemy', 'hero');
        this.enemyHero.damage = 48 + this.player.level * 4;
        this.enemyHero.maxHp = 650 + this.player.level * 60;
        this.enemyHero.hp = this.enemyHero.maxHp;

        this.entities = [this.player, this.enemyHero];
        this.projectiles = [];
        this.initStartingUnits();

        this.camera.x = pBase.x - this.camera.width / 2;
        this.camera.y = pBase.y - this.camera.height / 2;

        this.particles.createAuraRing(this.player.x, this.player.y, '#ffd700', 160);
        this.particles.addFloatingText(this.player.x, this.player.y - 70, `CAMPO: ${theme.toUpperCase()}`, '#ffd700', 24, true);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.camera) {
            this.camera.width = this.canvas.width;
            this.camera.height = this.canvas.height;
        }
    }

    initStartingUnits() {
        const pBase = this.map.capturePoints[0];
        const eBase = this.map.capturePoints[this.map.capturePoints.length - 1];
        const midBase = this.map.capturePoints[2];

        for (let i = 0; i < 3; i++) {
            const role = i === 1 ? 'archer' : (i === 2 ? 'mage' : 'warrior');
            this.entities.push(new BaseEntity(pBase.x - 30 + i * 30, pBase.y - 40 + i * 25, 'player', role));
        }

        for (let i = 0; i < 3; i++) {
            const role = i === 1 ? 'archer' : (i === 2 ? 'mage' : 'warrior');
            this.entities.push(new BaseEntity(eBase.x - 50 + i * 30, eBase.y - 40 + i * 25, 'enemy', role));
        }

        if (midBase) {
            this.entities.push(new BaseEntity(midBase.x - 40, midBase.y - 20, 'enemy', 'warrior'));
            this.entities.push(new BaseEntity(midBase.x + 40, midBase.y + 20, 'enemy', 'archer'));
        }
    }

    setupEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.sound.init();

            if (e.code === 'KeyQ') this.player.useSkill('q', this.mouse, this.entities, this.projectiles, this.particles, this.sound);
            if (e.code === 'KeyE') {
                if (this.player.useSkill('e', { x: this.mouse.worldX, y: this.mouse.worldY }, this.entities, this.projectiles, this.particles, this.sound)) {
                    this.camera.shake(14, 0.45);
                }
            }
            if (e.code === 'KeyR') this.player.useSkill('r', this.mouse, this.entities, this.projectiles, this.particles, this.sound);
            if (e.code === 'Space') {
                e.preventDefault();
                this.player.useSkill('space', this.mouse, this.entities, this.projectiles, this.particles, this.sound);
            }
            if (e.code === 'KeyF') this.player.useSkill('f', this.mouse, this.entities, this.projectiles, this.particles, this.sound);
            if (e.code === 'KeyB') this.toggleShopModal();
            if (e.code === 'Escape') {
                const modal = document.getElementById('shopModal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.worldX = e.clientX + this.camera.x;
            this.mouse.worldY = e.clientY + this.camera.y;
        });

        window.addEventListener('mousedown', (e) => {
            this.sound.init();
            if (e.button === 0) {
                this.mouse.isDown = true;
            } else if (e.button === 2) {
                this.player.targetDest = { x: this.mouse.worldX, y: this.mouse.worldY };
                this.particles.createAuraRing(this.mouse.worldX, this.mouse.worldY, '#00e5ff', 30);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.isDown = false;
            }
        });

        // Zoom with mouse scroll wheel
        window.addEventListener('wheel', (e) => {
            if (e.deltaY < 0) {
                this.camera.targetZoom = Math.min(1.25, this.camera.targetZoom + 0.08);
            } else {
                this.camera.targetZoom = Math.max(0.75, this.camera.targetZoom - 0.08);
            }
        }, { passive: true });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Minimap click navigation
        this.minimapCanvas.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const rect = this.minimapCanvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const targetWorldX = (clickX / this.minimapCanvas.width) * this.map.width;
            const targetWorldY = (clickY / this.minimapCanvas.height) * this.map.height;
            this.player.targetDest = { x: targetWorldX, y: targetWorldY };
            this.particles.createAuraRing(targetWorldX, targetWorldY, '#ffd700', 45);
        });

        // Minimap Toggle Button
        const toggleMapBtn = document.getElementById('toggleMinimapBtn');
        if (toggleMapBtn) {
            toggleMapBtn.addEventListener('click', () => {
                const wrapper = document.getElementById('minimapWrapper');
                if (wrapper) wrapper.classList.toggle('collapsed');
            });
        }

        // Fullscreen Toggle Button
        const fullBtn = document.getElementById('fullscreenBtn');
        if (fullBtn) {
            fullBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        // Sound Toggle Button
        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.sound.init();
                const enabled = this.sound.toggle();
                soundBtn.innerText = enabled ? '🔊 Som' : '🔇 Mudo';
            });
        }

        // Desktop Skill hotbar buttons
        ['q', 'e', 'r', 'space', 'f'].forEach(key => {
            const btn = document.getElementById(`btn-${key}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.triggerSkill(key);
                });
            }
        });

        // Shop Modal buttons
        const openShopBtn = document.getElementById('openShopBtn');
        if (openShopBtn) openShopBtn.addEventListener('click', () => this.toggleShopModal());

        const closeShopBtn = document.getElementById('closeShopBtn');
        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.toggleShopModal());

        // Map Selector Modal button
        const openMapBtn = document.getElementById('openMapBtn');
        if (openMapBtn) {
            openMapBtn.addEventListener('click', () => {
                const modal = document.getElementById('mapModal');
                if (modal) modal.classList.toggle('hidden');
            });
        }

        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) restartBtn.addEventListener('click', () => window.location.reload());
    }

    setupMobileControls() {
        // Virtual Joystick setup
        const joystickZone = document.getElementById('joystickZone');
        const joystickBase = document.getElementById('joystickBase');
        const joystickThumb = document.getElementById('joystickThumb');

        let touchId = null;
        let baseCenterX = 0;
        let baseCenterY = 0;
        const maxDist = 48;

        const onTouchStart = (e) => {
            this.sound.init();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (touchId === null) {
                    touchId = t.identifier;
                    const rect = joystickBase.getBoundingClientRect();
                    baseCenterX = rect.left + rect.width / 2;
                    baseCenterY = rect.top + rect.height / 2;
                    updateJoystickPosition(t.clientX, t.clientY);
                    break;
                }
            }
        };

        const onTouchMove = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    updateJoystickPosition(t.clientX, t.clientY);
                    break;
                }
            }
        };

        const onTouchEnd = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    touchId = null;
                    joystickThumb.style.transform = `translate(0px, 0px)`;
                    this.touchInput.active = false;
                    this.touchInput.dx = 0;
                    this.touchInput.dy = 0;
                    break;
                }
            }
        };

        const updateJoystickPosition = (clientX, clientY) => {
            let dx = clientX - baseCenterX;
            let dy = clientY - baseCenterY;
            const dist = Math.hypot(dx, dy);

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
            this.touchInput.active = true;
            this.touchInput.dx = dx / maxDist;
            this.touchInput.dy = dy / maxDist;

            // Also orient hero towards walk direction on mobile
            this.player.facingAngle = Math.atan2(dy, dx);
        };

        if (joystickZone) {
            joystickZone.addEventListener('touchstart', onTouchStart, { passive: false });
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd, { passive: false });
            window.addEventListener('touchcancel', onTouchEnd, { passive: false });
        }

        // Mobile Big Attack Button
        const mobAttackBtn = document.getElementById('mobileAttackBtn');
        if (mobAttackBtn) {
            const doAttack = (e) => {
                if (e.cancelable) e.preventDefault();
                this.sound.init();

                // Auto-aim towards nearest hostile enemy if within range
                let nearest = null;
                let minDist = 320;
                for (let ent of this.entities) {
                    if (!ent.isDead && ent.faction === 'enemy') {
                        const d = Math.hypot(ent.x - this.player.x, ent.y - this.player.y);
                        if (d < minDist) {
                            minDist = d;
                            nearest = ent;
                        }
                    }
                }

                if (nearest) {
                    this.player.facingAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
                }

                this.player.performMeleeAttack(this.entities, this.particles, this.sound);
            };

            mobAttackBtn.addEventListener('touchstart', doAttack, { passive: false });
            mobAttackBtn.addEventListener('click', doAttack);
        }

        // Mobile Satellite Skill Buttons
        ['q', 'e', 'r', 'space', 'f'].forEach(key => {
            const btn = document.getElementById(`m-btn-${key}`);
            if (btn) {
                const doSkill = (e) => {
                    if (e.cancelable) e.preventDefault();
                    this.triggerSkill(key);
                };
                btn.addEventListener('touchstart', doSkill, { passive: false });
                btn.addEventListener('click', doSkill);
            }
        });
    }

    triggerSkill(key) {
        this.sound.init();
        if (key === 'e') {
            // Find target or cast in front
            let target = {
                x: this.mouse.worldX || (this.player.x + Math.cos(this.player.facingAngle) * 220),
                y: this.mouse.worldY || (this.player.y + Math.sin(this.player.facingAngle) * 220)
            };

            // Auto-lock nearest enemy if on mobile
            if (this.touchInput.active || !this.mouse.worldX) {
                let nearest = null;
                let minDist = 400;
                for (let ent of this.entities) {
                    if (!ent.isDead && ent.faction === 'enemy') {
                        const d = Math.hypot(ent.x - this.player.x, ent.y - this.player.y);
                        if (d < minDist) {
                            minDist = d;
                            nearest = ent;
                        }
                    }
                }
                if (nearest) target = { x: nearest.x, y: nearest.y };
            }

            if (this.player.useSkill('e', target, this.entities, this.projectiles, this.particles, this.sound)) {
                this.camera.shake(14, 0.45);
            }
        } else {
            this.player.useSkill(key, this.mouse, this.entities, this.projectiles, this.particles, this.sound);
        }
    }

    toggleShopModal() {
        const modal = document.getElementById('shopModal');
        if (modal) {
            modal.classList.toggle('hidden');
            this.updateShopUI();
        }
    }

    buyUpgrade(type) {
        const costs = {
            damage: 60 + this.player.upgrades.damage * 45,
            health: 50 + this.player.upgrades.health * 40,
            cooldown: 75 + this.player.upgrades.cooldown * 50,
            speed: 55 + this.player.upgrades.speed * 40
        };

        const cost = costs[type];
        if (this.player.gold >= cost) {
            this.player.gold -= cost;
            this.player.upgrades[type]++;

            if (type === 'damage') this.player.damage += 14;
            if (type === 'health') {
                this.player.maxHp += 120;
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 120);
            }
            if (type === 'speed') this.player.speed += 25;

            this.sound.levelUp();
            this.particles.createAuraRing(this.player.x, this.player.y, '#ffd700', 105);
            this.particles.addFloatingText(this.player.x, this.player.y - 45, '★ MELHORIA ADQUIRIDA!', '#ffd700', 18, true);
            this.updateShopUI();
        }
    }

    updateShopUI() {
        const goldEl = document.getElementById('shopGoldDisplay');
        if (goldEl) goldEl.innerText = `${this.player.gold} 🪙`;

        const types = ['damage', 'health', 'cooldown', 'speed'];
        types.forEach(t => {
            const countEl = document.getElementById(`count-${t}`);
            const costEl = document.getElementById(`cost-${t}`);
            const btn = document.getElementById(`buy-${t}`);

            const costs = {
                damage: 60 + this.player.upgrades.damage * 45,
                health: 50 + this.player.upgrades.health * 40,
                cooldown: 75 + this.player.upgrades.cooldown * 50,
                speed: 55 + this.player.upgrades.speed * 40
            };
            const cost = costs[t];

            if (countEl) countEl.innerText = `Nvl ${this.player.upgrades[t]}`;
            if (costEl) costEl.innerText = `${cost} 🪙`;
            if (btn) {
                btn.disabled = this.player.gold < cost;
                btn.onclick = () => this.buyUpgrade(t);
            }
        });
    }

    loop(currentTime) {
        const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.isGameOver) return;
        this.reticleAngle += dt * 3.5;

        // 1. Update Camera
        this.mouse.worldX = this.mouse.x + this.camera.x;
        this.mouse.worldY = this.mouse.y + this.camera.y;
        this.camera.update(this.player.x, this.player.y, this.mouse.worldX, this.mouse.worldY, this.map.width, this.map.height, dt);

        // 2. Update Map and Checkpoints
        this.map.update(dt, this.entities, this.sound, this.particles);

        // 3. Ticket / Domination Score Generation
        this.scoreTickTimer += dt;
        if (this.scoreTickTimer >= 1.0) {
            this.scoreTickTimer = 0;
            let playerBases = 0;
            let enemyBases = 0;

            for (let cp of this.map.capturePoints) {
                if (cp.owner === 'player') playerBases++;
                if (cp.owner === 'enemy') enemyBases++;
            }

            if (this.map.capturePoints[2].owner === 'player') playerBases += 1.5;
            if (this.map.capturePoints[2].owner === 'enemy') enemyBases += 1.5;

            this.playerScore = Math.min(this.targetScore, this.playerScore + playerBases * 3);
            this.enemyScore = Math.min(this.targetScore, this.enemyScore + enemyBases * 3);

            if (playerBases > 0) {
                this.player.gainGold(Math.floor(playerBases * 2), this.particles);
            }

            if (this.playerScore >= this.targetScore) {
                this.endGame(true);
            } else if (this.enemyScore >= this.targetScore) {
                this.endGame(false);
            }
        }

        // 4. Reinforcements Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer >= 9.0) {
            this.spawnTimer = 0;
            for (let cp of this.map.capturePoints) {
                if (cp.owner !== 'neutral') {
                    const roles = ['warrior', 'archer', 'mage'];
                    const chosenRole = roles[Math.floor(Math.random() * roles.length)];
                    const soldier = new BaseEntity(cp.x + (Math.random() - 0.5) * 60, cp.y + (Math.random() - 0.5) * 60, cp.owner, chosenRole);
                    this.entities.push(soldier);
                }
            }
        }

        // 5. Enemy Hero Respawn
        if (this.enemyHero && this.enemyHero.isDead) {
            this.enemyHeroRespawnTimer += dt;
            if (this.enemyHeroRespawnTimer >= 20.0) {
                this.enemyHeroRespawnTimer = 0;
                const eBase = this.map.capturePoints[this.map.capturePoints.length - 1];
                this.enemyHero = new BaseEntity(eBase.x, eBase.y, 'enemy', 'hero');
                this.enemyHero.damage = 50 + this.player.level * 4;
                this.enemyHero.maxHp = 650 + this.player.level * 60;
                this.enemyHero.hp = this.enemyHero.maxHp;
                this.entities.push(this.enemyHero);
                this.particles.createAuraRing(this.enemyHero.x, this.enemyHero.y, '#ff2a55', 120);
                this.particles.addFloatingText(this.enemyHero.x, this.enemyHero.y - 60, '⚠ MALAKOR RENASCEU!', '#ff2a55', 24, true);
            }
        }

        // 6. Player Respawn
        if (this.player.isDead) {
            this.player.deathTimer -= dt;
            if (this.player.deathTimer <= 0) {
                const pBase = this.map.capturePoints[0];
                this.player.x = pBase.x;
                this.player.y = pBase.y;
                this.player.hp = this.player.maxHp;
                this.player.mana = this.player.maxMana;
                this.player.isDead = false;
                this.player.shield = 220;
                this.player.targetDest = null;
                this.particles.createAuraRing(this.player.x, this.player.y, '#00e5ff', 140);
                this.particles.addFloatingText(this.player.x, this.player.y - 50, '★ RESSUSCITADO NA BASE!', '#00e5ff', 24, true);
            }
        }

        // 7. Update Entities
        this.player.updateHero(dt, this.keys, this.mouse, this.touchInput, this.map, this.entities, this.projectiles, this.particles, this.sound);

        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            if (e === this.player) continue;

            if (e.isDead && e.deathTimer <= 0) {
                this.entities.splice(i, 1);
                continue;
            }

            if (e.role === 'hero' && e.faction === 'enemy') {
                AIController.updateEnemyHero(e, dt, this.map, this.entities, this.projectiles, this.particles, this.sound);
            } else {
                AIController.updateSoldier(e, dt, this.map, this.entities, this.projectiles, this.particles, this.sound);
            }
        }

        // 8. Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.entities, this.particles, this.sound);
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }

        // 9. Update Particles
        this.particles.update(dt);

        // 10. Update HUD UI
        this.updateHUD();
    }

    updateHUD() {
        const hpBar = document.getElementById('hpBarFill');
        const hpText = document.getElementById('hpText');
        const manaBar = document.getElementById('manaBarFill');
        const manaText = document.getElementById('manaText');
        const levelBadge = document.getElementById('playerLevelBadge');
        const xpBar = document.getElementById('xpBarFill');
        const goldDisplay = document.getElementById('playerGoldHUD');

        if (hpBar) hpBar.style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
        if (hpText) hpText.innerText = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;
        if (manaBar) manaBar.style.width = `${Math.max(0, (this.player.mana / this.player.maxMana) * 100)}%`;
        if (manaText) manaText.innerText = `${Math.round(this.player.mana)} / ${this.player.maxMana}`;
        if (levelBadge) levelBadge.innerText = `Nvl ${this.player.level}`;
        if (xpBar) xpBar.style.width = `${Math.min(100, (this.player.xp / this.player.xpToNext) * 100)}%`;
        if (goldDisplay) goldDisplay.innerText = `${this.player.gold} 🪙`;

        const playerDomBar = document.getElementById('playerDomBar');
        const enemyDomBar = document.getElementById('enemyDomBar');
        const scoreRatioText = document.getElementById('dominationScoreText');

        if (playerDomBar) playerDomBar.style.width = `${(this.playerScore / this.targetScore) * 100}%`;
        if (enemyDomBar) enemyDomBar.style.width = `${(this.enemyScore / this.targetScore) * 100}%`;
        if (scoreRatioText) scoreRatioText.innerText = `${Math.floor(this.playerScore)} : ${Math.floor(this.enemyScore)}`;

        // Cooldown swipes for desktop & mobile
        ['q', 'e', 'r', 'space', 'f'].forEach(key => {
            const skill = this.player.skills[key];
            const cdOverlay = document.getElementById(`cd-${key}`);
            const cdText = document.getElementById(`cd-text-${key}`);
            const mCdOverlay = document.getElementById(`m-cd-${key}`);

            if (skill) {
                const pct = (skill.currCd / skill.cd) * 100;
                if (skill.currCd > 0) {
                    if (cdOverlay) cdOverlay.style.height = `${pct}%`;
                    if (cdText) {
                        cdText.innerText = skill.currCd.toFixed(1);
                        cdText.style.display = 'block';
                    }
                    if (mCdOverlay) mCdOverlay.style.height = `${pct}%`;
                } else {
                    if (cdOverlay) cdOverlay.style.height = '0%';
                    if (cdText) cdText.style.display = 'none';
                    if (mCdOverlay) mCdOverlay.style.height = '0%';
                }
            }
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Draw Map Base
        this.map.draw(this.ctx, this.camera);

        // 2. Draw Ground Decals (blood splatters & scorch marks)
        this.particles.drawDecals(this.ctx, this.camera);

        // 3. Draw Entities (Sorted by Y for natural depth)
        const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);
        for (let e of sortedEntities) {
            e.draw(this.ctx, this.camera);
        }

        // 4. Draw Projectiles
        for (let p of this.projectiles) {
            p.draw(this.ctx, this.camera);
        }

        // 5. Draw Particles, Slashes & Combat Text
        this.particles.draw(this.ctx, this.camera);

        // 6. Dynamic 2D Lighting & Atmospheric Vignette Pass
        this.map.drawLighting(this.ctx, this.camera, this.player, this.entities);

        // 7. Dynamic Aiming Reticle & Skill AoE Indicators
        this.drawAimGuide();

        this.ctx.restore();

        // 8. Draw Minimap
        this.drawMinimap();
    }

    drawAimGuide() {
        if (this.player.isDead) return;

        // Dotted Aiming Line from Hero to Reticle
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([5, 7]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y);
        this.ctx.lineTo(this.mouse.worldX, this.mouse.worldY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Meteor [E] Skill ground preview (fiery summoning ring)
        const meteorSkill = this.player.skills['e'];
        if (meteorSkill && meteorSkill.currCd <= 0) {
            this.ctx.strokeStyle = 'rgba(255, 140, 0, 0.45)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 8]);
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.worldX, this.mouse.worldY, 165, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Dynamic Rotating Reticle Cursor
        this.ctx.translate(this.mouse.worldX, this.mouse.worldY);
        this.ctx.rotate(this.reticleAngle);

        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.shadowColor = '#00e5ff';
        this.ctx.shadowBlur = 10;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 24, 0, Math.PI * 2);
        this.ctx.stroke();

        // Crosshair ticks
        const tickLen = 8;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
            this.ctx.lineTo(Math.cos(a) * (16 + tickLen), Math.sin(a) * (16 + tickLen));
            this.ctx.stroke();
        }

        // Center dot
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawMinimap() {
        const mw = this.minimapCanvas.width;
        const mh = this.minimapCanvas.height;
        const scaleX = mw / this.map.width;
        const scaleY = mh / this.map.height;

        this.miniCtx.fillStyle = '#0e1511';
        this.miniCtx.fillRect(0, 0, mw, mh);

        // Roads
        this.miniCtx.strokeStyle = '#2f271f';
        this.miniCtx.lineWidth = 3;
        for (let r of this.map.roads) {
            this.miniCtx.beginPath();
            this.miniCtx.moveTo(r.from.x * scaleX, r.from.y * scaleY);
            this.miniCtx.lineTo(r.to.x * scaleX, r.to.y * scaleY);
            this.miniCtx.stroke();
        }

        // River
        this.miniCtx.strokeStyle = '#18384d';
        this.miniCtx.lineWidth = 5;
        this.miniCtx.beginPath();
        this.miniCtx.moveTo(this.map.riverPoints[0].x * scaleX, this.map.riverPoints[0].y * scaleY);
        for (let i = 1; i < this.map.riverPoints.length; i++) {
            this.miniCtx.lineTo(this.map.riverPoints[i].x * scaleX, this.map.riverPoints[i].y * scaleY);
        }
        this.miniCtx.stroke();

        // Checkpoints
        for (let cp of this.map.capturePoints) {
            const cx = cp.x * scaleX;
            const cy = cp.y * scaleY;
            let col = cp.owner === 'player' ? '#00e5ff' : (cp.owner === 'enemy' ? '#ff2a55' : '#8892b0');

            if (cp.isContested) {
                col = (Date.now() % 400 < 200) ? '#ffb703' : col;
            }

            this.miniCtx.fillStyle = col;
            this.miniCtx.beginPath();
            this.miniCtx.arc(cx, cy, 7, 0, Math.PI * 2);
            this.miniCtx.fill();
            this.miniCtx.strokeStyle = '#ffffff';
            this.miniCtx.lineWidth = 1.5;
            this.miniCtx.stroke();
        }

        // Entities
        for (let e of this.entities) {
            if (e.isDead) continue;
            const ex = e.x * scaleX;
            const ey = e.y * scaleY;

            this.miniCtx.fillStyle = e.faction === 'player' ? '#00e5ff' : '#ff2a55';
            this.miniCtx.beginPath();
            this.miniCtx.arc(ex, ey, e.isHero ? 4.5 : 2, 0, Math.PI * 2);
            this.miniCtx.fill();
        }

        // Frustum box
        this.miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        this.miniCtx.lineWidth = 1;
        this.miniCtx.strokeRect(
            this.camera.x * scaleX,
            this.camera.y * scaleY,
            this.camera.width * scaleX,
            this.camera.height * scaleY
        );
    }

    endGame(playerWon) {
        this.isGameOver = true;
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const subtitle = document.getElementById('gameOverSubtitle');

        if (playerWon) {
            this.sound.levelUp();
            title.innerText = '👑 VITÓRIA SUPREMA!';
            title.style.color = '#00e5ff';
            subtitle.innerText = 'Você conquistou os territórios e dominou o reino de ponta a ponta!';
        } else {
            title.innerText = '☠ DERROTA DO REINO!';
            title.style.color = '#ff2a55';
            subtitle.innerText = 'A Legião Carmesim tomou os postos e subjugou suas defesas.';
        }

        if (modal) modal.classList.remove('hidden');
    }
}

window.addEventListener('load', () => {
    window.game = new DominatorGame();
});
