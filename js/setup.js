"use strict"

function load$assets() {
    console.log('loading assets...')
    //this.scene.loadImg('background', 'res/img/city-scape.png')
    this.scene.loadImg('wall', 'res/img/brick-wall.png')
    this.scene.loadImg('cross', 'res/img/cross.png')

    // SFX
    this.scene.loadSfx('catapult-shot', 'res/sfx/double-swwosh.wav')
    this.scene.loadSfx('arrow-shot', 'res/sfx/whip.wav')
    this.scene.loadSfx('player-whells', 'res/sfx/whells.wav')
    this.scene.loadSfx('catapult-hit', 'res/sfx/armor-hit.wav')
    this.scene.loadSfx('catapult-destroyed', 'res/sfx/armor-hit.wav')
    this.scene.loadSfx('fort-hit', 'res/sfx/armor-hit.wav')
    this.scene.loadSfx('fort-destroyed', 'res/sfx/armor-hit.wav')
    this.scene.loadSfx('phalanx-hit', 'res/sfx/armor-hit.wav')
    this.scene.loadSfx('phalanx-destroyed', 'res/sfx/armor-hit.wav')

    this.scene.loadSfx('player-respawn', 'res/sfx/fanfare.wav')
    this.scene.loadSfx('catapult-spawn', 'res/sfx/power.wav')
    this.scene.loadSfx('enemy-catapult-spawn', 'res/sfx/power.wav')
    this.scene.loadSfx('phalanx-spawn', 'res/sfx/fanfare.wav')
    this.scene.loadSfx('enemy-phalanx-spawn', 'res/sfx/power.wav')
    this.scene.loadSfx('fort-spawn', 'res/sfx/fanfare.wav')
    this.scene.loadSfx('enemy-fort-spawn', 'res/sfx/power.wav')
    
    this.scene.loadSfx('next-level', 'res/sfx/power-up.mp3')

    this.scene.loadSfx('music', 'res/music/harp.wav')
}

function setup$assets() {
    console.log('setting up scene...')
    this.scene.sfx['music'].loop = true
    this.scene.sfx['music'].volume= 0.6
    //this.scene.sfx['music'].play()
}

// === keys ===
function key$79_o() {
    console.dir(this)
    console.table(this.scene.entities)
}

function key$80_p() {
    this.scene.pause = !this.scene.pause
}

function key$76_l() {
    this.scene.showStatus = !this.scene.showStatus
}

function key$77_m() {
    if (this.scene.sfx['music'].paused) {
        this.scene.sfx['music'].play()
    } else {
        this.scene.sfx['music'].pause()
    }
}

function draw$ground(ctx, delta) {
    //ctx.fillStyle = "#9B8976"
    //ctx.fillRect(0, 10, 20, 300)
}
