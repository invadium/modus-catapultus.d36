'use strict'

function rnd(n) {
    return Math.random() * n
}

function mutate$level(delta) {
    var x = -10000000
    this.scene.entities.map( function(e) {
        if (e.alive && e.actor && e.team === 1) {
            if (e.x > x) x = e.x
        }
    })
    if (x < 0) x = 0
    var nl = Math.floor(x / 1000)
    if (nl > this.scene.level) {
        this.scene.level++
        this.scene.play('next-level')
        console.log('new level: ' + this.scene.level + '!!!')
    }
}

function mutate$spawn(delta) {
    this.scene.spawnTime -= delta
    if (this.scene.spawnTime <= 0) {
        this.scene.spawnTime = this.scene.SPAWN_PERIOD

        // check if we need more enemies
        var forts = 0
        var playerForts = 0
        var catapultas = 0
        var playerCatapultas = 0
        var phalanx = 0
        var playerPhalanx = 0
        var enemyUnits = 0
        var playerUnits = 0
        var playerCatapult = false

        var fortifiedX = -10000000
        var topx = -10000000
        var playerBase = -10000000
        var playerHide = 10000000

        this.scene.entities.map( function(e) {
            if (e.alive && e.actor) {
                if (e.team > 1) {
                    if (e.kind === 'fort') {
                        forts++
                        if (e.x > fortifiedX) fortifiedX = e.x
                    } else if (e.kind === 'phalanx') {
                        phalanx++
                        enemyUnits++
                    } else if (e.kind === 'catapult') {
                        catapultas++
                        enemyUnits++
                    }
                } else if (e.team === 1) {
                    if (e.x < playerHide) playerHide = e.x
                    if (e.kind === 'fort') {
                        playerForts++
                        if (e.x > playerBase) playerBase = e.x
                    } else if (e.kind === 'phalanx') {
                        playerPhalanx++
                        playerUnits++
                    } else if (e.kind === 'catapult') {
                        playerCatapultas++
                        playerUnits++
                        if (e.focus) playerCatapult = true
                    }
                }
            }
        })
        this.scene.playerUnits = playerUnits
        this.scene.enemyUnits = enemyUnits

        if (topx === -10000000) topx = 0

        if (forts < 2) {
            // spawn fort
            var shift = 1000 + 1000*Math.random()
            var posx = topx + shift
            if (fortifiedX > topx) posx = fortifiedX + shift
            fortifiedX = posx
            console.log('spawning fort @' + posx)
            buildFort(this, posx, ENEMY)
            this.scene.play('enemy-fort-spawn')
        }

        var catapultNeed = 3 + this.scene.level
        if (catapultas < catapultNeed && fortifiedX > -9999999) {
            // spawn catapulta at deepest fort
            console.log('spawning enemy catapulta @' + fortifiedX)
            var c = new Catapult(fortifiedX, ENEMY)
            this.scene.registerEntity(c)
            this.scene.play('enemy-catapult-spawn')
        }

        if (playerForts < 1) {
            if (playerHide > 9999999) playerHide = 0
            // spawn fort
            var shift = 1000*Math.random()
            var posx = playerHide - shift
            playerBase = posx
            console.log('spawning player fort @' + posx)
            buildFort(this, posx, PLAYER)
            this.scene.play('fort-spawn')
        }

        if (!playerCatapult && playerBase > -9999999) {
            // spawn player catapulta
            console.log('respawning player @' + posx)
            var c = new Catapult(playerBase+100, PLAYER)
            c.bot = false
            c.focus = true
            this.scene.camera.target = c
            this.scene.registerEntity(c)
            this.scene.play('player-respawn')
        }
    }
}

function touch(t) {
    // get bounding volumes
    var lx = this.x - this.width/2
    var ly = this.y - this.height/2
    var tx = t.x - t.width/2
    var ty = t.y - t.height/2
    if (tx <= lx + this.width
            && tx + t.width >= lx
            && ty <= ly + this.height
            && ty + t.height >= ly) {
        return true
    }
    return false;
}
 
// test point on inside
function pick(x, y) {
    var lx = this.x - this.width/2
    var ly = this.y - this.height/2
    if (x >= lx && x <= lx+this.width && y >= ly && y <= ly+this.height) return true
    return false
}

function targetVal (val, delta, target) {
    if (val === target) return val
    if (val < target) {
        val += delta
        if (val > target) return target
    } else {
        val -= delta
        if (val < target) return target
    }
    return val
}

// === #panel ===
function Panel() {
    this.focus = true
    this.alive = true
    this.visible = false

    this.scene

    this.setup = function(collider) {
        this.scene = collider.scene
        this.scene.panel = this
    }

    this.handle = function(collider, delta) {
    }

    this.mutate = function(collider, delta) {
    }

    this.draw = function(ctx, delta) {
        if (this.imgCross == null) {
            this.imgCross = this.scene.img['cross']
            return
        }
        var w = this.scene.camera.width
        var h = this.scene.camera.height
        var t = this.scene.camera.target

        var sline = h-100
        var shift = 100
        var pos = w/2 - shift*3/2

        for (var i = 0; i < t.ammo.length; i++) {
            ctx.beginPath()
            if (i === t.selector) ctx.strokeStyle = '#E8855D'
            else ctx.strokeStyle = '#A8856D'
            ctx.lineWidth = '3'
            ctx.rect(pos, sline, 80, 80)
            ctx.stroke()

            var status = '' + t.ammo[i]
            ctx.fillStyle = "#D56931"
            ctx.font = '32px antic-bold'
            ctx.textBaseline = 'bottom'
            var margin = 80 - ctx.measureText(status).width
            ctx.fillText(status, pos+margin/2, sline+45)

            ctx.font = '20px antic'
            switch (i) {
                case 0: status = 'stone'
                        break;
                case 1: status = 'spawn'
                        break;
                case 2: status = 'build'
                        break;
            }
            ctx.fillStyle = "#D56931"
            ctx.font = '20px antic'
            ctx.textBaseline = 'bottom'
            margin = 80 - ctx.measureText(status).width
            ctx.fillText(status, pos + margin/2, sline+75)
            pos += shift
        }

        // score
        ctx.font = '24px antic-bold'
        ctx.textBaseline = 'bottom'

        // player
        margin = 50
        ctx.fillStyle = "#D56931"
        ctx.font = '28px antic-bold'
        ctx.fillText("Player", margin, 40)

        ctx.font = '22px antic-bold'
        status = 'Units - ' + this.scene.playerUnits
        ctx.fillText(status, margin, 90)
        status = 'Score - ' + this.scene.score
        ctx.fillText(status, margin, 130)
        status = 'Kills - ' + this.scene.kills + '  (' + this.scene.playerKills + ')'
        ctx.fillText(status, margin, 170)
        status = 'Level - ' + (this.scene.level+1)
        ctx.fillText(status, margin, 210)

        status = 'Advance - ' + (Math.round(t.x/50)) + ' steps'
        ctx.fillText(status, margin, h - 20)


        // enemy
        ctx.fillStyle = "#F56931"
        ctx.font = '28px antic-bold'
        status = "Enemy"
        margin = this.scene.camera.width - ctx.measureText(status).width - 50
        ctx.fillText(status, margin, 40)

        ctx.font = '22px antic-bold'
        status = 'Units - ' + this.scene.enemyUnits
        margin = this.scene.camera.width - ctx.measureText(status).width - 50
        ctx.fillText(status, margin, 90)
        status = 'Score - ' + this.scene.enemyScore
        margin = this.scene.camera.width - ctx.measureText(status).width - 50
        ctx.fillText(status, margin, 130)
        status = 'Kills - ' + this.scene.enemyKills + '  (' + this.scene.playerKilled + ')'
        margin = this.scene.camera.width - ctx.measureText(status).width - 50
        ctx.fillText(status, margin, 170)
    }

}

Panel.prototype._$entity_ = true

// === #particles ===
function Emitter(type, x, y, lifespan, force) {
    this.Z = 0

    this.alive = true
    this.visible = true
    this.team = 0
    this.type = type
    this.x = x
    this.y = y
    this.dx = 0
    this.dy = 0
    this.width = 100
    this.height = 100

    this.potential = 0
    this.force = force
    this.frequency = 1/this.force
    this.lifespan = lifespan
    this.particles = []
    this.Particle = function(x, y, speed, angle, lifespan, colorset) {
        this.alive = true
        this.r = 8
        this.gr = -this.r
        this.x = x
        this.y = y
        this.speed = speed
        this.angle = angle
        this.dx = Math.cos(angle) * speed
        this.dy = Math.sin(angle) * speed
        this.lifespan = lifespan
        this.maxspan = lifespan
        this.fadespan = this.lifespan/4
        this.color = colorset[Math.floor(Math.random() * colorset.length)]

        this.mutate = function(delta) {
            this.lifespan -= delta
            if (this.lifespan < 0) this.alive = false

            // gravity
            if (this.y < this.gr) {
                // fall
                this.dy += delta*75
            } else if (this.dx !== 0) {
                // friction
                this.dx = targetVal(this.dx, delta*75, 0)
            }
            // movement
            this.x += this.dx * delta
            this.y += this.dy * delta
            // ground
            if (this.y >= this.gr) {
                this.y = this.gr
                this.dy = 0
            }
        }

        this.draw = function(ctx) {
            ctx.fillStyle = this.color
            if (this.lifespan < this.fadespan) {
                ctx.globalAlpha = this.lifespan/this.fadespan
            } else {
                ctx.globalAlpha = 1
            }
            ctx.beginPath();
            ctx.moveTo(this.x-this.r, this.y)
            ctx.lineTo(this.x, this.y-this.r)
            ctx.lineTo(this.x+this.r, this.y)
            ctx.lineTo(this.x, this.y+this.r)
            ctx.closePath();
            ctx.fill();
        }
    }

    this.colorSet = ["#4F2610"]
    this.debrisColorSet = [
        '#4F2610',
        '#5F2510',
        '#4F4020',
        '#8F4020',
        '#D87030']

    this.createParticle = function() {
        switch(this.type) {
        case 1: 
            // debris
            var p = new this.Particle(
                    this.x + 50 - rnd(100),
                    this.y-rnd(20),
                    rnd(120),  // speed
                    Math.PI + rnd(Math.PI), // angle
                    4+rnd(12), // lifespan
                    this.colorSet)
            p.r = 2+rnd(12)
            return p
        case 2: 
            // stone hit
            var p = new this.Particle(
                    this.x,
                    this.y-10,
                    20 + rnd(120),
                    rnd(200),
                    Math.PI + rnd(Math.PI),
                    1+rnd(2),
                    this.colorSet)
            p.r = 2+rnd(6)
            return p
        case 3: 
            // fort debris
            var p = new this.Particle(
                    this.x + 64 - rnd(128),
                    this.y-rnd(20),
                    rnd(120),  // speed
                    Math.PI + rnd(Math.PI), // angle
                    4+rnd(12),
                    this.debrisColorSet) // lifespan
            p.r = 2+rnd(12)
            return p
        }
    }

    this.spawn = function() {
        var p = this.createParticle()
        // find a slot
        var placed = false
        for (var i = 0; i < this.particles.length; i++) {
           if (!this.particles[i].alive) {
               this.particles[i] = p
               placed = true
               break;
           }
        }
        if (!placed) this.particles.push(p)
    }

    this.mutate = function(collider, delta) {
        if (this.lifespan > 0) {
            this.lifespan -= delta
            if (this.lifespan < 0) this.lifespan = 0
        }

        // moving
        this.x += this.dx*delta
        this.y += this.dy*delta

        // emitting
        this.potential += delta
        while (this.lifespan !== 0 && this.potential >= this.frequency) {
            this.potential -= this.frequency
            this.spawn()
        }

        // mutating particles
        var pn = 0
        this.particles.map( function(p) {
            if (p.alive) {
                pn++
                p.mutate(delta)
            }
        })

        if (pn === 0 && this.lifespan === 0) this.alive = false
    }

    this.draw = function(ctx, delta) {
        ctx.save()
        this.particles.map( function(p) {
            if (p.alive) p.draw(ctx)
        })
        ctx.restore()
    }

}
Emitter.prototype._$entity_ = true
Emitter.prototype.kind = 'emitter'
Emitter.prototype.actor = false
Emitter.prototype.pick = pick

// === #projectile ===
function Projectile(source, x, y, angle, power) {
    this.Z = 1
    this.alive = true
    this.visible = true
    this.solid = true
    this.lifetime = 0
    this.team = 0
    this.source = source
    this.x = x
    this.y = y
    this.r = 8
    this.height = 8
    this.width = 8
    this.angle = angle
    this.power = power
    this.dx = Math.cos(angle) * power
    this.dy = Math.sin(angle) * power
    this.attack = 20
    this.type = 0

    this.mutate = function(collider, delta) {
        this.lifetime += delta
        this.x += this.dx * delta
        this.y += this.dy * delta
        this.dy += collider.scene.GRAVITY

        // ground collision
        if (this.y > -this.r/2) {
            this.alive = false

            if (this.type === 2) {
                buildFort(collider, this.x, source.team)
            } else if (this.type === 1) {
                // spawn catapult
                var c = new Catapult(this.x, this.source.team)
                collider.scene.registerEntity(c)

                var emt = new Emitter(2, this.x, this.y, 1, 100)
                collider.scene.registerEntity(emt)
            } else {
                var emt = new Emitter(2, this.x, this.y, 0.1, 100)
                collider.scene.registerEntity(emt)
            }
        }
    }

    this.draw = function(ctx, delta) {
        ctx.beginPath()
        if (this.source.team === 1) {
            if (this.type === 2) ctx.strokeStyle = '#DB2002'
            else if (this.type === 1) ctx.strokeStyle = '#FED24F'
            else ctx.strokeStyle = '#A8856D'
        } else {
            ctx.strokeStyle = '#E0654D'
        }
        ctx.lineWidth = '5'
        ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI)
        ctx.stroke()
    }

    this.collide = function(target) {
        if (this.lifetime < 1) return
        if (target === this.source) return
        if (target.hit) target.hit(this, this.attack)
        var emt = new Emitter(2, this.x, this.y, 0.1, 100)
        collider.scene.registerEntity(emt)
        this.alive = false
    }
}
Projectile.prototype._$entity_ = true
Projectile.prototype.kind = 'projectile'
Projectile.prototype.pick = pick

function key$32_space() {
    this.scene.camera.target.scheduleShoot()
}
function key$69_space() {
    this.scene.camera.target.scheduleShoot()
}

function key$16_shift() {
    this.scene.camera.target.select()
}
function key$81_q() {
    this.scene.camera.target.select()
}

// === #catapult ===
function Catapult(x, team) {
    this.Z = 2
    this.ACC = 20
    this.BRAKE = 10
    this.MIN_DX = -40 // max backward speed
    this.MAX_DX = 40 // max speed
    this.AIM_SPEED = 1
    this.MIN_AIM = Math.PI + 0.3
    this.MAX_AIM = Math.PI*2 - 0.3
    this.MIN_CHARGE= 40
    this.CHARGE_RANGE = 200
    this.CHARGING_FACTOR = 1
    this.RECHARGE = 1
    this.MAX_LIFE = 100
    this.FIX_RATE = 5
    this.MAX_AMMO = 40
    this.RESUPPLY_RATE = 0.5
    this.dir = 1
    if (team > 1) this.dir = -1

    this.__proto__.index++
    this.name = this.kind + ' ' + this.index
    this.alive = true
    this.visible = true
    this.solid = true
    this.focus = false
    this.fire = false
    this.force = false
    this.blockProgress = false

    this.team = team
    this.life = this.MAX_LIFE

    this.x = x
    this.height = 40
    this.y = -this.height/2
    this.width = 120
    this.dx = 0
    this.dy = 0
    this.aim = 5.5
    this.charge = 0
    this.recharge = this.RECHARGE
    this.mass = 100
    this.power = 10

    this.selector = 0
    this.ammo = [this.MAX_AMMO, 0, 0]
    this.ammoSupply = 0
    this.ammoSupply2 = 0

    // AI
    this.bot = true
    this.action = 'advance'
    this.actionTime = 5
    this.target = null

    this.scene

    this.setup = function(collider) {
        this.scene = collider.scene
    }

    this.select = function() {
        this.selector--
        if (this.selector < 0) this.selector = this.ammo.length - 1
    }

    this.scheduleShoot = function() {
        this.fire = true
    }

    this.hit = function(source, attack) {
        this.life -= attack
        if (this.life <= 0) {
            this.alive = false
            var blow = new Emitter(1, this.x, this.y, 0.2, 250)
            this.scene.registerEntity(blow)
            if (source.source.team === 1 && this.team > 1) {
                this.scene.kills++
                this.scene.score += 100
                if (source.source.focus) this.scene.playerKills++
            } else if (source.source.team > 1 && this.team === 1) {
                this.scene.enemyKills++
                this.scene.enemyScore += 100
                if (this.focus) this.scene.playerKilled++
            }
            this.scene.play('catapult-destroyed')
        } else {
            this.scene.play('catapult-hit')
        }
        
    }

    this.aimLeft= function(delta) {
        this.aim = collider.math.limitMin(collider.math.normalizeAngle(this.aim - this.AIM_SPEED * delta), this.MIN_AIM)
    } 

    this.aimRight = function(delta) {
        this.aim = collider.math.limitMax(collider.math.normalizeAngle(this.aim + this.AIM_SPEED * delta), this.MAX_AIM)
    } 

    this.moveLeft = function(delta) {
        if (this.team > 1 && this.blockProgress) {
            this.blockProgress = false
            return
        }
        this.force = true
        if (this.focus && this.dx === 0) this.scene.play('player-whells')
        this.dx = collider.math.limitMin(this.dx - this.ACC*delta, this.MIN_DX)
    }

    this.moveRight = function(delta) {
        if (this.team === 1 && this.blockProgress) {
            this.blockProgress = false
            return
        }
        this.force = true
        this.dx = collider.math.limitMax(this.dx + this.ACC*delta, this.MAX_DX)
        if (this.focus && this.dx === 0) this.scene.play('player-whells')
    }

    this.doCharge = function(delta) {
        if (this.recharge > this.RECHARGE && this.ammo[this.selector] > 0) {
            this.charge = collider.math.limitMax(this.charge + this.CHARGING_FACTOR*delta, 1)
        }
    }

    this.handle = function(collider, delta) {
        var keys = collider.scene.keys
        this.force = false

        if (keys[32] || keys[69]) {
            this.doCharge(delta)
        }
        if (keys[38] || keys[87]) {
            this.aimLeft(delta)
        }
        if (keys[40] || keys[83]) {
            this.aimRight(delta)
        }
        if (keys[37] || keys[65]) {
            this.moveLeft(delta)
        }
        if (keys[39] || keys[68]) {
            this.moveRight(delta)
        }
    }

    // === AI ===
    this.WAIT_CHANCE = 0.3
    this.WAIT_MIN = 1
    this.WAIT_RANGE = 2
    this.RANDOM_CHANCE = 0.2
    this.CHARGE_FACTOR = 0.2
    this.FIRE_DENSITY_FACTOR = 3
    this.aimPrecision = 0.005
    this.aimTarget = 0
    this.chargeTarget = 0
    this.aimTable = [
        { r: 80,     a: 5,       c: 0.08 },
        { r: 100,    a: 4.98,    c: 0.156 },
        { r: 140,    a: 5.02,    c: 0.19 },
        { r: 160,    a: 5.49,    c: 0.1 },
        { r: 170,    a: 5.15,    c: 0.018 },
        { r: 200,    a: 5.15,    c: 0.22 },
        { r: 270,    a: 5.27,    c: 0.24 },
        { r: 320,    a: 5.62,    c: 0.24 },
        { r: 380,    a: 5.35,    c: 0.30 },
        { r: 430,    a: 5.57,    c: 0.32 },
        { r: 460,    a: 5.46,    c: 0.35 },
        { r: 490,    a: 5.68,    c: 0.37 },
        { r: 530,    a: 5.49,    c: 0.39 },
        { r: 570,    a: 5.30,    c: 0.44 },
        { r: 610,    a: 5.50,    c: 0.43 },
        { r: 640,    a: 5.67,    c: 0.47 },
        { r: 690,    a: 5.51,    c: 0.48 },
        { r: 726,    a: 5.37,    c: 0.51 },
        { r: 760,    a: 5.40,    c: 0.52 },
        { r: 825,    a: 5.35,    c: 0.57 },
        { r: 895,    a: 5.39,    c: 0.59 },
        { r: 925,    a: 5.39,    c: 0.52 },
        { r: 1000,   a: 5.40,    c: 0.60 },
        { r: 1040,   a: 5.39,    c: 0.65 },
        { r: 1330,   a: 5.62,    c: 0.76 },
        { r: 1480,   a: 5.51,    c: 0.80 },
        { r: 10000000, a: 5.51,  c: 1 },
    ]

    this.scanForEnemies = function(collider) {
        var minx = this.x - collider.scene.camera.width
        var maxx = this.x + collider.scene.camera.width
        var vicinity = []
        var team = this.team
        collider.scene.entities.map( function(e) {
            if (e.alive
                && e.visible
                && e.actor
                && e.team !== team
                && e.x > minx && e.x < maxx) {
                vicinity.push(e)
            }
        })
        if (vicinity.length > 0) {
            var selected = Math.floor(Math.random() * vicinity.length)
            return vicinity[selected]
        }
        return null
    }

    this.nextRandomAction = function(collider) {
        var act = Math.random()
        var time = Math.random() * 7
        if (act < 0.2) {
            this.action = 'retreat'
            this.actionTime = time
        } else if (act < 0.7) {
            this.action = 'advance'
            this.actionTime = time
        } else {
            this.action = 'wait'
            this.actionTime = time
        }
        console.log('[' + this.name + '] spontaneous action - ' + this.action)
    }

    this.nextAction = function(collider) {
        if (this.life <= 40) {
            this.action = 'retreat'
            return
        }
        if (this.ammo[0] <= 3) {
            this.action = 'resupply'
            return
        }

        if (Math.random() < this.WAIT_CHANCE) {
            this.action = 'wait'
            this.actionTime = this.WAIT_MIN + this.WAIT_RANGE * Math.random()
            return
        }
        if (Math.random() < this.RANDOM_CHANCE) {
            this.nextRandomAction(collider)
            return 
        }

        // try to find target
        this.target = this.scanForEnemies(collider)
        if (this.target != null) {
            this.action = 'atack'
            this.actionTime = 6
            this.aimTarget = -1
            this.chargeTarget = -1
            if (Math.random() < this.CHARGE_FACTOR) {
                this.action = 'charge'
                console.log('[' + this.name + '] charging @' + this.target.name)
            } else {
                console.log('[' + this.name + '] attacking @' + this.target.name)
            }
            return
        }

        // just advance
        this.action = 'advance'
        this.actionTime = 2
    }

    this.lockOnTarget = function() {
        if (!this.target) return
        var tx = this.target.x - this.x
        var dist = tx
        if (dist < 0) dist *= -1
        var i = 0
        var taim = -1
        var tcharge = -1
        while (taim < 0) {
            var at = this.aimTable[i++]
            if (dist < at.r) {
                taim = at.a
                tcharge = at.c
            }
        }
        this.aimTarget = taim
        this.chargeTarget = tcharge
        if (tx < 0) this.aimTarget -= Math.PI/2 // Y-mirror
    }

    this.homing = function(delta) {
        if (this.aim < this.aimTarget - this.aimPrecision) {
            this.aimRight(delta)
            return false
        } else if (this.aim > this.aimTarget + this.aimPrecision) {
            this.aimLeft(delta)
            return false
        } else if (this.charge < this.chargeTarget) {
            this.doCharge(delta)
            return false
        }
        return true
    }

    this.behave = function(collider, delta) {
        this.force = false

        if (this.action === 'random') {
            this.nextRandomAction(collider)
            return
        }

        if (this.actionTime > 0) {
            this.actionTime -= delta
            if (this.actionTime <= 0) {
                this.actionTime = 0
                this.nextAction(collider)
                return
            }
        }

        if (this.action === 'advance') {
            if (this.dir > 0) this.moveRight(delta)
            else this.moveLeft(delta)
        } else if (this.action === 'retreat') {
            if (this.dir > 0) this.moveLeft(delta)
            else this.moveRight(delta)
        } else if (this.action === 'resupply') {
            if (this.dir > 0) this.moveLeft(delta)
            else this.moveRight(delta)
        } else if (this.action === 'atack') {
            if (this.aimTarget < 0) this.lockOnTarget()
            if (this.homing(delta)) this.fire = true
        } else if (this.action === 'charge') {
            if (this.aimTarget < 0) this.lockOnTarget()
            if (this.homing(delta)) this.fire = true
            if (this.dir > 0) this.moveRight(delta)
            else this.moveLeft(delta)
        } else if (this.action === 'wait') {
        }
    }

    this.mutate = function(collider, delta) {
        this.x += this.dx * delta
        this.y += this.dy * delta

        this.recharge += delta

        if (this.fire & this.recharge > this.RECHARGE && this.ammo[this.selector] > 0) {
            var speed = this.MIN_CHARGE + this.CHARGE_RANGE * this.charge
            var p = new Projectile(this, this.x, this.y-20, this.aim, speed)
            p.type = this.selector
            p.dx += this.dx
            p.dy += this.dy
            collider.scene.registerEntity(p)
            this.ammo[this.selector]--

            this.fire = false
            this.charge = 0
            this.recharge = 0
            this.aimTarget = -1
            this.chargeTarget = -1
            if (this.bot) {
                this.recharge -= this.FIRE_DENSITY_FACTOR * Math.random()
            }
            collider.scene.play('catapult-shot')
        }

        // break
        if (!this.force) {
            this.dx = collider.math.targetVal(this.dx, this.BRAKE*delta, 0)
            this.dy = collider.math.targetVal(this.dy, this.BRAKE*delta, 0)
        }

        // ground collision
        if (this.y > -this.height/2) this.y = -this.height/2
    }

    this.collide = function(target, delta) {
        /*
        // block fire
        if (target.kind === 'catapult' || target.kind === 'fort' || target.kind === 'phalanx') {
            this.fire = false
            this.charge = 0
            this.recharge = 0

            if (this.bot && this.action === 'attack') this.action = 'random'
        }
        */

        if (target.kind === 'fort') {
            if (target.team !== this.team) {
                this.blockProgress = true
            } else {
                // our fort - fix if needed!
                this.life += this.FIX_RATE * delta / 2
                if (this.life > this.MAX_LIFE) this.life = this.MAX_LIFE

                // resupply
                if (this.ammo[0] < this.MAX_AMMO) {
                    this.ammoSupply += this.RESUPPLY_RATE * delta/2

                    if (this.ammoSupply > 1) {
                        this.ammo[0]++
                        this.ammoSupply--
                    }
                } else if (this.ammo[1] < this.MAX_AMMO || this.ammo[2] < this.MAX_AMMO) {
                    this.ammoSupply += this.RESUPPLY_RATE * delta/4
                    this.ammoSupply2 += this.RESUPPLY_RATE * delta/6

                    if (this.ammoSupply > 1) {
                        if (this.ammo[1] < this.MAX_AMMO) {
                            this.ammo[1]++
                        }
                        this.ammoSupply--
                    }
                    if (this.ammoSupply2 > 1) {
                        if (this.ammo[2] < this.MAX_AMMO) {
                            this.ammo[2]++
                        }
                        this.ammoSupply2--
                    }
                }

                if (this.bot && this.action === 'retreat') {
                    // wait until fixed
                    this.action = 'wait'
                    this.actionTime = (this.MAX_LIFE-this.life) / this.FIX_RATE
                }
                if (this.bot && this.action === 'resupply') {
                    // wait until resupplied 
                    this.action = 'wait'
                    this.actionTime = (this.MAX_AMMO - this.ammo[0]) / this.RESUPPLY_RATE
                }
            }
        }
    }

    this.draw = function(ctx, delta, collider) {
        ctx.beginPath()

        var bodyColor
        if (this.team === 1) {
            if (this.focus) {
                bodyColor = '#7B3017'
            } else {
                bodyColor = '#A8856D'
            }
        } else {
            bodyColor = '#E0654D'
        }

        // body
        if (this.focus) {
            ctx.lineWidth = '7'
        } else {
            ctx.lineWidth = '4'
        }
        ctx.strokeStyle = bodyColor
        ctx.rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height)
        ctx.stroke()
        
        if (this.focus) {
            ctx.fillStyle = bodyColor
            ctx.fillRect(this.x-this.width/2, this.y-10, this.width, 17)
        }

        var ax = Math.cos(this.aim) * 50
        var ay = Math.sin(this.aim) * 50

        // recharge status
        if (this.recharge > this.RECHARGE && this.ammo[this.selector] > 0) {
            ctx.beginPath()
            ctx.strokeStyle = bodyColor
            ctx.lineWidth = '5'
            ctx.arc(this.x, this.y - 20, 8, 0, 2*Math.PI)
            ctx.stroke()
        }

        // aim arcs
        ctx.beginPath()
        ctx.strokeStyle = bodyColor
        ctx.lineWidth = '3'
        ctx.arc(this.x, this.y - 20, 15, Math.PI, 2*Math.PI)
        ctx.stroke()
        ctx.beginPath()
        ctx.lineWidth = '1'
        ctx.arc(this.x, this.y - 20, 25, Math.PI, 2*Math.PI)
        ctx.stroke()
        ctx.beginPath()
        ctx.lineWidth = '2'
        ctx.arc(this.x, this.y - 20, 30, Math.PI, 2*Math.PI)
        ctx.stroke()

        // aim 
        ctx.strokeStyle = bodyColor
        ctx.lineWidth = '4'
        ctx.beginPath()
        ctx.moveTo(this.x, this.y - 20)
        ctx.lineTo(this.x + ax, this.y - 20 + ay)
        ctx.stroke()
        // charge
        var cx = ax * this.charge
        var cy = ay * this.charge
        ctx.strokeStyle = '#F8856D'
        ctx.lineWidth = '4'
        ctx.beginPath()
        ctx.moveTo(this.x + ax, this.y - 20 + ay)
        ctx.lineTo(this.x + ax-cx, this.y - 20 + ay-cy)
        ctx.stroke()

        // life
        var lb = this.life / this.MAX_LIFE
        var bm = 5
        var bw = this.width - 10

        if (this.team === 1) {
            ctx.strokeStyle = '#FF7335'
        } else {
            ctx.strokeStyle = '#DB2002'
        }
        ctx.lineWidth = '5'
        ctx.beginPath()
        ctx.moveTo(this.x - bw/2, this.y + 12)
        ctx.lineTo(this.x - bw/2 + bw*lb, this.y + 12)
        ctx.stroke()

        // status if needed
        if (collider.scene.showStatus) {
            ctx.fillStyle = "#D56931"
            ctx.font = '16px alien'
            ctx.textBaseline = 'bottom'

            var status = this.name + ' x' + Math.round(this.x) + ' *' + this.ammo[0]

            if (this.bot) {
                status += ' - ' + this.action
                    if (this.target) {
                    status += ' @' + this.target.name
                }
            }

            var tw2 = ctx.measureText(status).width / 2
            ctx.fillText(status, this.x-tw2, this.y+this.height/2+30)
        }
    }
}
Catapult.prototype._$entity_ = true
Catapult.prototype.kind = 'catapult'
Catapult.prototype.index = 0
Catapult.prototype.touch = touch
Catapult.prototype.pick = pick
Catapult.prototype.actor = true


// === #fort ====
function buildFort(collider, x, team) {
    var fort = new Fort(x, team)
    collider.scene.registerEntity(fort)

    var emt = new Emitter(3, x, 0, 1, 100)
    emt.dy = -200
    collider.scene.registerEntity(emt)

    return fort
}

function Fort(x, team) {
    this.Z = 4
    this.MAX_LIFE = 200
    this.BUILD_FACTOR = 100
    this.name = this.kind + ' ' + this.index
    this.alive = true
    this.visible = true
    this.solid = true
    this.focus = false

    this.team = team
    this.life = 100
    this.buildTarget = 0
    this.x = x
    this.y = 0
    this.width = 128
    this.height = 0
    this.imgWall

    this.scene

    this.setup = function(collider) {
        this.scene = collider.scene
        this.__proto__.imgWall = collider.scene.img['wall']
    }

    this.hit = function(source, attack) {
        if (source.source.team === this.team && source.type === 2) {
            // rebuild
            this.life = this.life + attack
            if (this.life > this.MAX_LIFE*2) this.life = this.MAX_LIFE*2
            this.scene.play('fort-spawn')
            return
        }

        this.life -= attack/4
        if (this.life <= 0) {
            this.alive = false
            var blow = new Emitter(1, this.x, this.y, 0.3, 400)
            this.scene.registerEntity(blow)
            this.scene.play('fort-destroyed')
        } else {
            var blow = new Emitter(1, this.x, this.y, 0.1, 100)
            this.scene.registerEntity(blow)
            this.scene.play('fort-hit')
        }
    }

    this.mutate = function(collider, delta) {
        // TODO move normalization to hit event
        // normalize according to life
        if (this.buildtarget !== this.life) {
            this.buildTarget = collider.math.targetVal(this.buildTarget, delta*this.BUILD_FACTOR, this.life)
            this.height = this.buildTarget * 2
        } else {
            this.height = this.life * 2
        }

        this.y = -this.height/2
    }

    this.draw = function(ctx, delta) {
        ctx.beginPath()
        if (this.team === 1) {
            ctx.strokeStyle = '#403020'
            ctx.lineWidth = '10'
        } else {
            ctx.strokeStyle = '#D87030'
            ctx.lineWidth = '12'
        }
        ctx.rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height)
        ctx.stroke()

        ctx.imageSmoothingEnabled = false;
        if (this.imgWall) {
            var h = 0
            var dh = 32
            while (h < this.height) {
                if (h + dh > this.height) dh = this.height - h
                ctx.drawImage(this.imgWall,
                        this.x - this.width/2,
                        this.y - this.height/2 + h,
                        this.width, dh)
                h += dh
            }
        }

    }
}
Fort.prototype._$entity_ = true
Fort.prototype.kind = 'fort'
Fort.prototype.index = 0
Fort.prototype.touch = touch
Fort.prototype.pick = pick
Fort.prototype.actor = true


// === #phalanx ====
function Phalanx(x, team) {
    this.Z = 3
    this.MAX_LIFE = 200
    this.SPEED = 10
    this.name = this.kind + ' ' + this.index
    this.alive = true
    this.visible = true
    this.solid = true
    this.focus = false
    this.bot = true

    this.team = team
    this.life = 100
    this.x = x
    this.width = 100
    this.height = 40
    this.y = -this.height/2
    this.dx = 0
    this.dy = 0

    this.scene

    this.setup = function(collider) {
        this.scene = collider.scene
    }

    this.hit = function(source, attack) {
        this.life -= attack
        if (this.life <= 0) {
            this.alive = false
            this.scene.play('phalanx-destroyed')
        } else {
            this.scene.play('phalanx-hit')
        }
    } 

    this.behave = function(collider, delta) {
        if (this.team === 1) {
            this.dx = this.SPEED
        } else {
            this.dx = -this.SPEED
        }
    }

    this.mutate = function(collider, delta) {
        // normalize according to life
        this.width = this.life

        this.x += this.dx * delta
        this.y += this.dy * delta

        // ground collision
        if (this.y > -this.height/2) this.y = -this.height/2
    }

    this.draw = function(ctx, delta) {
        ctx.beginPath()
        ctx.strokeStyle = '#804030'
        ctx.lineWidth = '3'
        ctx.rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height)
        ctx.stroke()
    }

}
Phalanx.prototype._$entity_ = true
Phalanx.prototype.kind = 'phalanx'
Phalanx.prototype.index = 0
Phalanx.prototype.touch = touch
Phalanx.prototype.pick = pick
Phalanx.prototype.actor = true

// create entities
var PLAYER = 1
var ENEMY = 2

var fort1 = new Fort(150, PLAYER)
fort1.buildTarget = fort1.life
//var phalanx1 = new Phalanx(350, PLAYER)
var catapult1 = new Catapult(350, PLAYER)
catapult1.focus = true
catapult1.bot = false
catapult1.ammo[1] = 10
catapult1.ammo[2] = 5

var catapult3 = new Catapult(550, PLAYER)

var fort2 = new Fort(1500, ENEMY)
fort2.buildTarget = fort2.life
//var phalanx2 = new Phalanx(800, ENEMY)
var catapult2 = new Catapult(950, ENEMY)

var camera = new Camera()
camera.y = -400
camera.target = catapult1

var panel = new Panel()

