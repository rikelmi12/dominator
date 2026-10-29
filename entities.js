// DOMINATOR - Enhanced Entities: 3-Hit Combos, Hit Reactions, Projectiles, and Combat AI

class Projectile {
    constructor(x, y, targetX, targetY, type, damage, faction, source) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.type = type;
        this.damage = damage;
        this.faction = faction;
        this.source = source;
        this.speed = type === 'arrow' ? 640 : (type === 'fireball' ? 460 : 520);

        const dx = targetX - x;
        const dy = targetY - y;
        this.dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        this.distanceTraveled = 0;
        this.maxDistance = Math.min(720, this.dist + 50);
        this.isDead = false;

        if (type === 'meteor') {
            this.startX = x;
            this.startY = y - 480;
            this.currX = this.startX;
            this.currY = this.startY;
            this.landX = targetX;
            this.landY = targetY;
            this.progress = 0;
            this.radius = 165;
        }
    }

    update(dt, entities, particleSystem, soundManager) {
        if (this.isDead) return;

        if (this.type === 'meteor') {
            this.progress += dt * 1.85;
            this.currX = this.startX + (this.landX - this.startX) * this.progress;
            this.currY = this.startY + (this.landY - this.startY) * this.progress;

            particleSystem.add({
                x: this.currX + (Math.random() - 0.5) * 16,
                y: this.currY + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 2,
                size: 16,
                color: Math.random() > 0.5 ? '#ff3c00' : '#ffb703',
                decay: 0.05
            });

            if (this.progress >= 1) {
                this.isDead = true;
                soundManager.meteorImpact();
                particleSystem.createExplosion(this.landX, this.landY, this.radius);

                for (let e of entities) {
                    if (!e.isDead && e.faction !== this.faction) {
                        const d = Math.hypot(e.x - this.landX, e.y - this.landY);
                        if (d <= this.radius) {
                            const falloff = 1 - (d / this.radius) * 0.4;
                            e.takeDamage(this.damage * falloff, this.faction, particleSystem, soundManager, 'Meteoro', true);
                            const kAngle = Math.atan2(e.y - this.landY, e.x - this.landX);
                            e.x += Math.cos(kAngle) * 45;
                            e.y += Math.sin(kAngle) * 45;
                        }
                    }
                }
            }
            return;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.distanceTraveled += this.speed * dt;

        if (this.type === 'fireball') {
            particleSystem.add({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                size: 7,
                color: this.faction === 'player' ? '#00e5ff' : '#ff4400',
                decay: 0.08
            });
        }

        for (let e of entities) {
            if (!e.isDead && e.faction !== this.faction) {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < e.radius + 8) {
                    this.isDead = true;
                    e.takeDamage(this.damage, this.faction, particleSystem, soundManager, this.type);
                    if (this.type === 'fireball') {
                        particleSystem.createExplosion(this.x, this.y, 48);
                    } else {
                        particleSystem.createSparks(this.x, this.y, '#ffffff', 6);
                    }
                    break;
                }
            }
        }

        if (this.distanceTraveled >= this.maxDistance) {
            this.isDead = true;
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;

        if (this.type === 'meteor') {
            ctx.save();
            // Ground targeting shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            const shadowRadius = Math.min(50, 16 + this.progress * 34);
            ctx.beginPath();
            ctx.ellipse(this.landX, this.landY, shadowRadius, shadowRadius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Falling Meteor core
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ff2200';
            ctx.beginPath();
            ctx.arc(this.currX, this.currY, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(this.currX - 3, this.currY - 3, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (!camera.isVisible(this.x, this.y, 30)) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'arrow') {
            ctx.strokeStyle = '#c2a649';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(14, 0);
            ctx.stroke();

            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(7, -4);
            ctx.lineTo(7, 4);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-14, -3, 3, 6);
        } else if (this.type === 'fireball') {
            const col = this.faction === 'player' ? '#00e5ff' : '#ff4400';
            ctx.shadowColor = col;
            ctx.shadowBlur = 14;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-2, -2, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class BaseEntity {
    constructor(x, y, faction, role = 'warrior') {
        this.x = x;
        this.y = y;
        this.faction = faction;
        this.role = role;
        this.isHero = (role === 'hero');

        this.maxHp = this.isHero ? 750 : (role === 'warrior' ? 240 : (role === 'archer' ? 150 : 140));
        this.hp = this.maxHp;
        this.shield = 0;
        this.damage = this.isHero ? 58 : (role === 'warrior' ? 26 : (role === 'archer' ? 22 : 34));
        this.speed = this.isHero ? 250 : (role === 'warrior' ? 165 : (role === 'archer' ? 180 : 155));
        this.attackRange = (role === 'archer' || role === 'mage') ? 350 : 60;
        this.attackCooldown = 0;
        this.attackSpeed = this.isHero ? 0.38 : (role === 'warrior' ? 0.9 : 1.3);

        this.radius = this.isHero ? 25 : 17;
        this.facingAngle = faction === 'player' ? 0 : Math.PI;
        this.isDead = false;
        this.deathTimer = 0;

        // Visual animation & combat feel
        this.walkCycle = 0;
        this.swingProgress = 0;
        this.isSwinging = false;
        this.buffTimer = 0;
        this.hitFlashTimer = 0; // Visual hit reaction
        this.target = null;
        this.isTargetedByPlayer = false; // Lock-on reticle
    }

    takeDamage(amount, sourceFaction, particleSystem, soundManager, type = 'attack', isCrit = false) {
        if (this.isDead) return;

        let finalDamage = amount;
        this.hitFlashTimer = 0.08; // Flash white on hit

        if (this.shield > 0) {
            if (this.shield >= finalDamage) {
                this.shield -= finalDamage;
                particleSystem.addFloatingText(this.x, this.y - 20, `🛡️ ${Math.round(finalDamage)}`, '#70d6ff', 15);
                return;
            } else {
                finalDamage -= this.shield;
                this.shield = 0;
            }
        }

        this.hp -= finalDamage;
        particleSystem.createBlood(this.x, this.y, this.isHero ? 14 : 7);

        // Knockback recoil away from damage source
        if (sourceFaction) {
            const recoilAngle = this.facingAngle + Math.PI;
            this.x += Math.cos(recoilAngle) * 5;
            this.y += Math.sin(recoilAngle) * 5;
        }

        const textColor = isCrit ? '#ffbe0b' : (this.faction === 'player' ? '#ff5964' : '#ffffff');
        particleSystem.addFloatingText(this.x, this.y - 20, Math.round(finalDamage), textColor, isCrit ? 22 : 16, isCrit);

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            this.deathTimer = 2.0;
            soundManager.swordHit();

            if (this.isHero) {
                particleSystem.createExplosion(this.x, this.y, 75);
                particleSystem.addFloatingText(this.x, this.y - 40, '☠ DERROTADO!', '#ff0033', 28, true);
            }
        } else {
            soundManager.swordHit();
        }
    }

    update(dt) {
        if (this.isDead) {
            this.deathTimer -= dt;
            return;
        }

        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }

        if (this.buffTimer > 0) {
            this.buffTimer -= dt;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        if (this.isSwinging) {
            this.swingProgress += dt * 8;
            if (this.swingProgress >= 1) {
                this.isSwinging = false;
                this.swingProgress = 0;
            }
        }
    }

    draw(ctx, camera) {
        if (!camera.isVisible(this.x, this.y, this.radius + 35)) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, this.deathTimer / 2.0);
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.2, this.radius * 0.6, this.facingAngle, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        // Shadow
        ctx.fillStyle = 'rgba(8, 10, 14, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 7, this.radius * 1.15, this.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hit Flash effect
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Buff Aura
        if (this.buffTimer > 0) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 9, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Shield Aura
        if (this.shield > 0) {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 13, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Rotate body
        ctx.rotate(this.facingAngle);

        const isPlayer = (this.faction === 'player');
        const teamColor = isPlayer ? '#00b4d8' : '#e63946';
        const teamDark = isPlayer ? '#0077b6' : '#9b2226';
        const metalColor = isPlayer ? '#e0e1dd' : '#3d405b';

        if (this.role === 'hero') {
            // Hero Cape
            ctx.fillStyle = isPlayer ? '#005f73' : '#6b111a';
            ctx.beginPath();
            ctx.moveTo(-16, -14);
            ctx.lineTo(-34 + Math.sin(this.walkCycle) * 5, 0);
            ctx.lineTo(-16, 14);
            ctx.closePath();
            ctx.fill();

            // Pauldrons
            ctx.fillStyle = metalColor;
            ctx.beginPath();
            ctx.arc(0, -14, 10, 0, Math.PI * 2);
            ctx.arc(0, 14, 10, 0, Math.PI * 2);
            ctx.fill();

            // Body Armor
            ctx.fillStyle = teamColor;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Helm Crest
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(4, 0, 9, 0, Math.PI * 2);
            ctx.fill();

            // Greatsword with swing animation
            ctx.save();
            if (this.isSwinging) {
                const swingAngle = -1.3 + this.swingProgress * 2.6;
                ctx.rotate(swingAngle);
            }
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = isPlayer ? '#00f0ff' : '#ff0055';
            ctx.shadowBlur = 14;
            ctx.fillRect(8, -4, 34, 8);
            ctx.fillStyle = isPlayer ? '#00f0ff' : '#ff0055';
            ctx.fillRect(5, -9, 5, 18);
            ctx.restore();

        } else if (this.role === 'warrior') {
            ctx.fillStyle = teamColor;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = metalColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Shield
            ctx.fillStyle = teamDark;
            ctx.beginPath();
            ctx.arc(4, -12, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Sword
            ctx.save();
            if (this.isSwinging) ctx.rotate(-0.8 + this.swingProgress * 1.6);
            ctx.fillStyle = '#e0e1dd';
            ctx.fillRect(6, 6, 18, 5);
            ctx.restore();

        } else if (this.role === 'archer') {
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = teamColor;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#8d6e63';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(10, 0, 14, -Math.PI / 2.5, Math.PI / 2.5);
            ctx.stroke();
        } else if (this.role === 'mage') {
            ctx.fillStyle = isPlayer ? '#3a0ca3' : '#4a0e17';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#8a5a36';
            ctx.fillRect(8, 6, 18, 4);

            ctx.fillStyle = isPlayer ? '#00f0ff' : '#ff4400';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(28, 8, 6.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Lock-on Target Reticle
        if (this.isTargetedByPlayer && !this.isDead) {
            ctx.save();
            ctx.strokeStyle = '#ff2a55';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff2a55';
            ctx.shadowBlur = 8;
            const r = this.radius + 12;
            // Bracket corners
            const d = 8;
            ctx.beginPath();
            // Top-left
            ctx.moveTo(this.x - r, this.y - r + d); ctx.lineTo(this.x - r, this.y - r); ctx.lineTo(this.x - r + d, this.y - r);
            // Top-right
            ctx.moveTo(this.x + r - d, this.y - r); ctx.lineTo(this.x + r, this.y - r); ctx.lineTo(this.x + r, this.y - r + d);
            // Bottom-left
            ctx.moveTo(this.x - r, this.y + r - d); ctx.lineTo(this.x - r, this.y + r); ctx.lineTo(this.x - r + d, this.y + r);
            // Bottom-right
            ctx.moveTo(this.x + r - d, this.y + r); ctx.lineTo(this.x + r, this.y + r); ctx.lineTo(this.x + r, this.y + r - d);
            ctx.stroke();
            ctx.restore();
        }

        // Overhead Health Bar
        if (!this.isDead && (this.hp < this.maxHp || this.isHero || this.isTargetedByPlayer)) {
            const barW = this.isHero ? 50 : 34;
            const barH = this.isHero ? 6 : 4;
            const barX = this.x - barW / 2;
            const barY = this.y - this.radius - 15;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

            const hpPct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = this.faction === 'player' ? '#2ec4b6' : '#e71d36';
            ctx.fillRect(barX, barY, barW * hpPct, barH);

            if (this.shield > 0) {
                const shieldPct = Math.min(1, this.shield / this.maxHp);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
                ctx.fillRect(barX, barY - 3, barW * shieldPct, 2);
            }

            if (this.isHero) {
                ctx.font = 'bold 11px "Cinzel", sans-serif';
                ctx.fillStyle = this.faction === 'player' ? '#ffd700' : '#ff477e';
                ctx.textAlign = 'center';
                ctx.fillText(this.faction === 'player' ? '👑 LORD DOMINATOR' : '💀 GENERAL MALAKOR', this.x, barY - 5);
            }
        }
    }
}

class PlayerHero extends BaseEntity {
    constructor(x, y) {
        super(x, y, 'player', 'hero');
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 100;
        this.gold = 50;
        this.mana = 200;
        this.maxMana = 200;
        this.manaRegen = 15;

        // 3-Hit Combo Attack System
        this.comboIndex = 0; // 0: Slash 1, 1: Slash 2, 2: Heavy Cleave
        this.comboResetTimer = 0;

        // Skills & Cooldowns
        this.skills = {
            q: { name: 'Lâmina Giratória', cd: 4.5, currCd: 0, mana: 30, icon: '🌀' },
            e: { name: 'Chuva de Meteoros', cd: 8.0, currCd: 0, mana: 60, icon: '☄️' },
            r: { name: 'Grito de Guerra', cd: 12.0, currCd: 0, mana: 50, icon: '📯' },
            space: { name: 'Investida Fantasma', cd: 2.8, currCd: 0, mana: 15, icon: '⚡' },
            f: { name: 'Convocar Tropa', cd: 18.0, currCd: 0, mana: 70, icon: '🛡️' }
        };

        this.upgrades = {
            damage: 0,
            health: 0,
            cooldown: 0,
            speed: 0
        };

        this.targetDest = null;
    }

    gainXp(amount, particleSystem, soundManager) {
        this.xp += amount;
        particleSystem.addFloatingText(this.x, this.y - 35, `+${amount} XP`, '#ffd700', 16);

        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.round(this.xpToNext * 1.5);
            this.maxHp += 80;
            this.hp = this.maxHp;
            this.maxMana += 30;
            this.mana = this.maxMana;
            this.damage += 12;

            soundManager.levelUp();
            particleSystem.createAuraRing(this.x, this.y, '#ffd700', 95);
            particleSystem.addFloatingText(this.x, this.y - 65, `★ NÍVEL ${this.level}!`, '#ffd700', 26, true);
        }
    }

    gainGold(amount, particleSystem) {
        this.gold += amount;
        particleSystem.addFloatingText(this.x + 20, this.y - 30, `+${amount} 🪙`, '#ffb703', 15);
    }

    updateHero(dt, keys, mousePos, touchInput, map, entities, projectiles, particleSystem, soundManager) {
        super.update(dt);
        if (this.isDead) return;

        this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);

        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0) {
                this.comboIndex = 0;
            }
        }

        for (let k in this.skills) {
            if (this.skills[k].currCd > 0) {
                this.skills[k].currCd = Math.max(0, this.skills[k].currCd - dt);
            }
        }

        // Movement from Keyboard or Virtual Joystick
        let dx = 0;
        let dy = 0;

        if (touchInput && touchInput.active) {
            // Virtual Joystick direction
            dx = touchInput.dx;
            dy = touchInput.dy;
            this.targetDest = null;
        } else {
            if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
        }

        if (dx !== 0 || dy !== 0) {
            this.targetDest = null;
            const len = Math.hypot(dx, dy);
            const moveSpeed = this.speed * (this.buffTimer > 0 ? 1.4 : 1.0);
            this.x += (dx / len) * moveSpeed * dt;
            this.y += (dy / len) * moveSpeed * dt;
            this.walkCycle += dt * 14;

            if (Math.random() < 0.25) {
                particleSystem.add({
                    x: this.x + (Math.random() - 0.5) * 10,
                    y: this.y + 10,
                    size: 3,
                    color: 'rgba(180, 160, 140, 0.5)',
                    decay: 0.05
                });
            }
        } else if (this.targetDest) {
            const distToDest = Math.hypot(this.targetDest.x - this.x, this.targetDest.y - this.y);
            if (distToDest > 15) {
                const angle = Math.atan2(this.targetDest.y - this.y, this.targetDest.x - this.x);
                const moveSpeed = this.speed * (this.buffTimer > 0 ? 1.4 : 1.0);
                this.x += Math.cos(angle) * moveSpeed * dt;
                this.y += Math.sin(angle) * moveSpeed * dt;
                this.walkCycle += dt * 14;
            } else {
                this.targetDest = null;
            }
        }

        this.x = Math.max(40, Math.min(map.width - 40, this.x));
        this.y = Math.max(40, Math.min(map.height - 40, this.y));

        // Facing direction: follow mouse or movement direction
        if (touchInput && touchInput.aimActive) {
            this.facingAngle = touchInput.aimAngle;
        } else if (mousePos && mousePos.worldX !== undefined) {
            this.facingAngle = Math.atan2(mousePos.worldY - this.y, mousePos.worldX - this.x);
        } else if (dx !== 0 || dy !== 0) {
            this.facingAngle = Math.atan2(dy, dx);
        }

        // Target Lock-On test under cursor
        for (let e of entities) {
            if (!e.isDead && e.faction === 'enemy') {
                const distToCursor = Math.hypot(e.x - mousePos.worldX, e.y - mousePos.worldY);
                e.isTargetedByPlayer = (distToCursor < e.radius + 20);
            } else {
                e.isTargetedByPlayer = false;
            }
        }

        // Basic Melee Attack with 3-Hit Combo
        if (mousePos.isDown && this.attackCooldown <= 0) {
            this.performMeleeAttack(entities, particleSystem, soundManager);
        }
    }

    performMeleeAttack(entities, particleSystem, soundManager) {
        if (this.attackCooldown > 0 || this.isDead) return;

        this.attackCooldown = this.attackSpeed;
        this.isSwinging = true;
        this.swingProgress = 0;
        this.comboResetTimer = 1.2;

        const isThirdCombo = (this.comboIndex === 2);
        const slashColor = isThirdCombo ? '#ffd700' : '#00e5ff';
        const slashRadius = isThirdCombo ? 100 : 85;

        // Visual Slash Arc
        particleSystem.addSlashArc(this.x, this.y, this.facingAngle, slashRadius, slashColor, 1.8);
        soundManager.swordSwing();

        // Hit detection
        for (let e of entities) {
            if (!e.isDead && e.faction === 'enemy') {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < slashRadius + 15) {
                    const angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                    let diff = Math.abs(this.facingAngle - angleToEnemy);
                    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

                    if (diff < 1.45) {
                        const isCrit = isThirdCombo || (Math.random() < 0.25);
                        let dmgMultiplier = isThirdCombo ? 2.2 : (this.comboIndex === 1 ? 1.3 : 1.0);
                        if (this.buffTimer > 0) dmgMultiplier *= 1.5;

                        const dmg = this.damage * dmgMultiplier;
                        e.takeDamage(dmg, 'player', particleSystem, soundManager, 'sword', isCrit);

                        // Sparks on hit
                        particleSystem.createSparks(e.x, e.y, slashColor, 8);

                        if (e.isDead) {
                            this.gainXp(e.isHero ? 200 : 40, particleSystem, soundManager);
                            this.gainGold(e.isHero ? 80 : 18, particleSystem);
                        }
                    }
                }
            }
        }

        // Advance Combo
        this.comboIndex = (this.comboIndex + 1) % 3;
    }

    useSkill(key, targetPos, entities, projectiles, particleSystem, soundManager) {
        if (this.isDead) return false;
        const skill = this.skills[key];
        if (!skill || skill.currCd > 0 || this.mana < skill.mana) return false;

        this.mana -= skill.mana;
        const cdReduction = (1 - (this.upgrades.cooldown * 0.1));
        skill.currCd = skill.cd * cdReduction;

        if (key === 'q') {
            soundManager.warcry();
            this.isSwinging = true;
            particleSystem.createAuraRing(this.x, this.y, '#00e5ff', 135);
            particleSystem.addSlashArc(this.x, this.y, 0, 130, '#00e5ff', Math.PI * 2);

            for (let e of entities) {
                if (!e.isDead && e.faction === 'enemy') {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d <= 145) {
                        e.takeDamage(this.damage * 2.3, 'player', particleSystem, soundManager, 'whirlwind', true);
                        if (e.isDead) {
                            this.gainXp(e.isHero ? 200 : 40, particleSystem, soundManager);
                            this.gainGold(e.isHero ? 80 : 18, particleSystem);
                        }
                    }
                }
            }
            return true;
        }

        if (key === 'e') {
            soundManager.spellCast();
            projectiles.push(new Projectile(this.x, this.y, targetPos.x, targetPos.y, 'meteor', this.damage * 3.6, 'player', this));
            return true;
        }

        if (key === 'r') {
            soundManager.warcry();
            this.buffTimer = 8.0;
            this.shield = Math.min(450, this.shield + 220);
            particleSystem.createAuraRing(this.x, this.y, '#ffd700', 260);
            particleSystem.triggerSpeedLines(this.x, this.y, this.facingAngle);
            particleSystem.addFloatingText(this.x, this.y - 45, '⚔️ GRITO DE GUERRA! (+DANO, +ESCUDO)', '#ffd700', 20, true);

            for (let e of entities) {
                if (!e.isDead && e.faction === 'player') {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d <= 360) {
                        e.buffTimer = 8.0;
                        e.shield = Math.min(220, e.shield + 110);
                        particleSystem.addFloatingText(e.x, e.y - 30, '★ FORTALECIDO!', '#ffd700', 14);
                    }
                }
            }
            return true;
        }

        if (key === 'space') {
            soundManager.dash();
            const dashDist = 200;
            const targetX = this.x + Math.cos(this.facingAngle) * dashDist;
            const targetY = this.y + Math.sin(this.facingAngle) * dashDist;

            particleSystem.triggerSpeedLines(this.x, this.y, this.facingAngle);

            for (let i = 0; i < 7; i++) {
                const t = i / 7;
                particleSystem.add({
                    x: this.x + (targetX - this.x) * t,
                    y: this.y + (targetY - this.y) * t,
                    size: 18,
                    color: 'rgba(0, 229, 255, 0.45)',
                    decay: 0.08
                });
            }

            this.x = targetX;
            this.y = targetY;
            return true;
        }

        if (key === 'f') {
            soundManager.warcry();
            particleSystem.createAuraRing(this.x, this.y, '#00e5ff', 85);
            particleSystem.addFloatingText(this.x, this.y - 45, '🛡️ GUARDA REAL INVOCADA!', '#00e5ff', 18, true);

            const roles = ['warrior', 'archer', 'mage'];
            roles.forEach((r, idx) => {
                const angle = (idx / 3) * Math.PI * 2;
                const soldier = new BaseEntity(this.x + Math.cos(angle) * 50, this.y + Math.sin(angle) * 50, 'player', r);
                soldier.buffTimer = 6.0;
                entities.push(soldier);
            });
            return true;
        }

        return false;
    }
}

class AIController {
    static updateSoldier(soldier, dt, map, entities, projectiles, particleSystem, soundManager) {
        soldier.update(dt);
        if (soldier.isDead) return;

        let nearestEnemy = null;
        let minDist = soldier.attackRange + (soldier.role === 'warrior' ? 220 : 160);

        for (let e of entities) {
            if (!e.isDead && e.faction !== soldier.faction) {
                const d = Math.hypot(e.x - soldier.x, e.y - soldier.y);
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = e;
                }
            }
        }

        if (nearestEnemy) {
            soldier.target = nearestEnemy;
            soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
            const dist = Math.hypot(nearestEnemy.x - soldier.x, nearestEnemy.y - soldier.y);

            if (dist <= soldier.attackRange) {
                if (soldier.attackCooldown <= 0) {
                    soldier.attackCooldown = soldier.attackSpeed;

                    if (soldier.role === 'warrior') {
                        soldier.isSwinging = true;
                        soldier.swingProgress = 0;
                        soundManager.swordSwing();
                        particleSystem.addSlashArc(soldier.x, soldier.y, soldier.facingAngle, 45, soldier.faction === 'player' ? '#00e5ff' : '#ff3344', 1.4);
                        nearestEnemy.takeDamage(soldier.damage * (soldier.buffTimer > 0 ? 1.4 : 1.0), soldier.faction, particleSystem, soundManager, 'sword');
                    } else if (soldier.role === 'archer') {
                        soundManager.arrowShoot();
                        projectiles.push(new Projectile(soldier.x, soldier.y, nearestEnemy.x, nearestEnemy.y, 'arrow', soldier.damage, soldier.faction, soldier));
                    } else if (soldier.role === 'mage') {
                        soundManager.spellCast();
                        projectiles.push(new Projectile(soldier.x, soldier.y, nearestEnemy.x, nearestEnemy.y, 'fireball', soldier.damage, soldier.faction, soldier));
                    }
                }
            } else {
                const moveSpeed = soldier.speed * (soldier.buffTimer > 0 ? 1.3 : 1.0);
                soldier.x += Math.cos(soldier.facingAngle) * moveSpeed * dt;
                soldier.y += Math.sin(soldier.facingAngle) * moveSpeed * dt;
                soldier.walkCycle += dt * 10;
            }
            return;
        }

        let targetCP = null;
        let bestScore = -999999;

        for (let cp of map.capturePoints) {
            const dist = Math.hypot(cp.x - soldier.x, cp.y - soldier.y);
            let score = -dist;
            if (cp.owner !== soldier.faction) score += 1500;
            if (score > bestScore) {
                bestScore = score;
                targetCP = cp;
            }
        }

        if (targetCP) {
            const distToCP = Math.hypot(targetCP.x - soldier.x, targetCP.y - soldier.y);
            if (distToCP > targetCP.radius * 0.6) {
                soldier.facingAngle = Math.atan2(targetCP.y - soldier.y, targetCP.x - soldier.x);
                soldier.x += Math.cos(soldier.facingAngle) * soldier.speed * dt;
                soldier.y += Math.sin(soldier.facingAngle) * soldier.speed * dt;
                soldier.walkCycle += dt * 8;
            }
        }
    }

    static updateEnemyHero(hero, dt, map, entities, projectiles, particleSystem, soundManager) {
        hero.update(dt);
        if (hero.isDead) return;

        let nearestPlayer = null;
        let minDist = 420;

        for (let e of entities) {
            if (!e.isDead && e.faction === 'player') {
                const d = Math.hypot(e.x - hero.x, e.y - hero.y);
                if (d < minDist) {
                    minDist = d;
                    nearestPlayer = e;
                }
            }
        }

        if (nearestPlayer) {
            hero.facingAngle = Math.atan2(nearestPlayer.y - hero.y, nearestPlayer.x - hero.x);
            const dist = Math.hypot(nearestPlayer.x - hero.x, nearestPlayer.y - hero.y);

            if (hero.attackCooldown <= 0) {
                hero.attackCooldown = hero.attackSpeed;
                hero.isSwinging = true;
                hero.swingProgress = 0;
                soundManager.swordSwing();

                if (dist < 110) {
                    particleSystem.addSlashArc(hero.x, hero.y, hero.facingAngle, 65, '#ff0055', 1.8);
                    nearestPlayer.takeDamage(hero.damage * 1.5, 'enemy', particleSystem, soundManager, 'cleave', true);
                } else if (dist > 180 && Math.random() < 0.45) {
                    projectiles.push(new Projectile(hero.x, hero.y, nearestPlayer.x, nearestPlayer.y, 'fireball', hero.damage * 1.25, 'enemy', hero));
                }
            }

            if (dist > 70) {
                hero.x += Math.cos(hero.facingAngle) * hero.speed * dt;
                hero.y += Math.sin(hero.facingAngle) * hero.speed * dt;
                hero.walkCycle += dt * 10;
            }
            return;
        }

        let targetCP = map.capturePoints.find(cp => cp.owner === 'player' || cp.owner === 'neutral') || map.capturePoints[0];
        if (targetCP) {
            const dist = Math.hypot(targetCP.x - hero.x, targetCP.y - hero.y);
            if (dist > 85) {
                hero.facingAngle = Math.atan2(targetCP.y - hero.y, targetCP.x - hero.x);
                hero.x += Math.cos(hero.facingAngle) * hero.speed * dt;
                hero.y += Math.sin(hero.facingAngle) * hero.speed * dt;
                hero.walkCycle += dt * 8;
            }
        }
    }
}
