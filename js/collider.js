/**************************************************************
 *
 * Collider.JS Player
 *
 * (C) 2016 ColliderLabs
 *
 * ************************************************************/

// expose collider to global scope
_ = collider = (function(window) {

"use strict"

// there is collider and there is mapping to a page
// we can create our own canvas(es) or map to existing
// "canvas" by default

var TARGET_FPS = 60
var MAX_EVO_TIME = 0.1

var cnv, ctx
var lastFrame = Date.now()

var _collider = function(val) {
    console.log(val)
}

var scene = {
    name: "Scene",
    mouseX: 0,
    mouseY: 0,
    mouseButton: '---',
    keys: {},
    showStatus: false,
    globalStatus: '',

    GRAVITY: 0.5,
    SPAWN_PERIOD: 4,
    
    ready: false,
    pause: false,
    resIncluded: 0,
    resLoaded: 0,
    img: {},
    sfx: {},
    maxZ: 0,
    spawnTime: 0,

    level: 0,
    score: 0,
    kills: 0,
    playerKills: 0,
    playerUnits: 0,
    enemyScore: 0,
    enemyKills: 0,
    playerKilled: 0,
    enemyUnits: 0,
    camera: { x: 0, y: 0, rotation: 0.05, scale: 1},
    loaders: [],
    starters: [],
    entities: [],
    handlers: [],
    keyListeners: [],
    mutators: [],
    painters: [],

    isFun: function(f) {
        return !!(f && f.constructor && f.call && f.apply);
    },

    registerEntity: function(e) {
        var placed = false
        for (var i = 0; i < this.entities.length; i++) {
           if (!this.entities[i].alive) {
               this.entities[i] = e
               placed = true
               break;
           }
        }
        if (!placed) this.entities.push(e)

        if (e.name) {
            this.entities[e.name] = e
        }
        if (e.Z) {
            if (e.Z > scene.maxZ) {
                scene.maxZ = e.Z
            }
        }
        // special case for camera
        if (e.kind === 'camera') {
            this.camera = e
            console.log('assigning camera: ' + e.name)
        }
        
        if (e.setup) {
            e.setup(_collider)
        }
    },

    registerLoader: function(f) {
        if (!this.isFun(f)) return;
        this.loaders.push(f)
    },

    registerStarter: function(f) {
        if (!this.isFun(f)) return;
        this.starters.push(f)
    },

    registerHandler: function(f) {
        if (!this.isFun(f)) return;
        this.handlers.push(f)
    },

    registerKeyListener: function(f, key) {
        if (!this.isFun(f)) return
        // trip the name to key and parse the key code
        if (key.startsWith('key$')) key = key.substring(4)
        var tail = key.indexOf('_')
        if (tail >= 0) {
            key = key.substring(0, tail)
        }
        if (key.length === 0) {
            throw new Error("can't register property " + key)
        }
        var code = parseInt(key)
        this.keyListeners[code] = f
    },

    registerMutator: function(f) {
        if (!this.isFun(f)) return;
        this.mutators.push(f)
    },

    registerDrawer: function(f) {
        if (!this.isFun(f)) return;
        this.painters.push(f)
    },

    normalizeActions: function() {
        this.loaders.sort();
        this.handlers.sort();
        this.mutators.sort();
        this.painters.sort();
    },

    loadImg: function(name, src) {
        var img = new Image()
        img.src = src
        img.onload = onLoad
        this.resReady = false
        this.resIncluded++
        this.img[name] = img
    },

    loadSfx: function(name, src) {
        var audio = new Audio(src)
        audio.preload = true
        this.sfx[name] = audio
    },

    play: function(name) {
        var audio = this.sfx[name]
        if (audio) {
            audio.play()
        } else {
            console.log("can't find audio for " + name)
        }
    }
}

function init() {
    console.log('setting up game...')
    // binding to graphical context by convention
    // > should be possible to create and bind manually multiple contexes
    cnv = document.getElementById("canvas")
    ctx = cnv.getContext("2d")
    //cnv.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); //Chrome
    //cnv.mozRequestFullScreen(); //Firefox

    // inject load, input, evo and render actions and entities
    for (var key in window) {
        if (key.startsWith('load$')) {
            scene.registerLoader(window[key])
        } else if (key.startsWith('setup$')) {
            scene.registerStarter(window[key])
        } else if (key.startsWith('handle$')) {
            scene.registerHandler(window[key])
        } else if (key.startsWith('key$')) {
            scene.registerKeyListener(window[key], key)
        } else if (key.startsWith('mutate$')) {
            scene.registerMutator(window[key])
        } else if (key.startsWith('draw$')) {
            scene.registerDrawer(window[key])
        } else if (key.startsWith('obj$')) {
            var obj = window[key]
            if (obj.name === undefined) {
                obj.name = key.substring(3,key.length())
            }
            scene.registerEntity(obj)
        } else {
            // test if we have an entity to register
            try {
            var obj = window[key]
            if (obj && obj._$entity_) {
                if (obj.name === undefined) {
                    obj.name = key
                }
                scene.registerEntity(obj)
            }
            } catch(err) {
                // just ignoring properties we can't get
            }
        }
    }
    scene.normalizeActions(); // TODO find how to change

    expandCanvas()

    load()

    if (scene.resIncluded === 0) setup()

    // initiate the game loop
    if (TARGET_FPS <= 0) {
        setInterval(loop, 1)
    } else {
        setInterval(loop, 1000/TARGET_FPS)
    }
}

// > implement 'keepOriginalAspectRatio'&'aspectRatio' option
function expandCanvas() {
    var canvas = document.getElementById('canvas')
    var newWidth = window.innerWidth
    var newHeight = window.innerHeight
    scene.width = canvas.width = newWidth
    scene.height = canvas.height = newHeight
    canvas.style.width = newWidth + 'px'
    canvas.style.height = newHeight + 'px'
    render(0)
}

function handleMouse(e) {
    e = e || window.event
    scene.mouseX = e.pageX
    scene.mouseY = e.pageY
    e.preventDefault()
    e.stopPropagation()
    return false;
}

function handleMouseDown(e) {
    switch (e.button) {
    case 0: scene.mouseButton = '*--';
            // pick entities
            var x = scene.mouseX - scene.camera.x
            var y = scene.mouseY + scene.camera.y
            scene.entities.map( function(e) {
                if (scene.isFun(e.pick)) {
                    if (e.pick(x, y)) {
                        if (e.name) console.log('--- ' + e.name + '---')
                        else console.log('---' + e.kind + '---')
                        console.dir(e)
                    }
                }
            })
            break;
    case 1: scene.mouseButton = '-*-';
            break;
    case 2: scene.mouseButton = '--*';
            break;
    }
    e.preventDefault()
    e.stopPropagatton = e.button
    return false;
}

function handleMouseUp(e) {
    scene.pause = false
    scene.mouseButton = '---'
}

function handleMouseDoubleClick(e) {
    scene.pause = false
    switch (e.button) {
    case 0: scene.mouseButton = '+--';
            break;
    case 1: scene.mouseButton = '-+-';
            break;
    case 2: scene.mouseButton = '--+';
            break;
    }
    e.preventDefault()
    e.stopPropagatton = e.button
    return false;
}

function handleMouseOut(e) {
    for (var k in scene.keys) {
        delete scene.keys[k]
    }
}

function handleContextMenu() {
    return false;
}

function handleKeyDown(e) {
    var code = e.which || e.keyCode
    scene.keys[code] = true

    if (code !== 80) scene.pause = false // dirty rule for P

    e.preventDefault()
    e.stopPropagation()
    return false;
}

function handleKeyUp(e) {
    var code = e.which || e.keyCode
    scene.keys[code] = false

    // check if we have listener for this key
    if (scene.keyListeners[code]) {
        scene.keyListeners[code].apply(_collider, [e])
    }

    e.preventDefault()
    e.stopPropagation()
    return false;
}

function onLoad() {
    // TODO remove timing - this is high latency emulation
    setTimeout(function() {
        scene.resLoaded++
        if (scene.resLoaded >= scene.resIncluded) {
            console.log(scene.resLoaded + ' resources loaded!')
            setup()
        }
    }, Math.round(Math.random() * 500))
}

function load() {
    scene.loaders.map( function(l) {
        l.apply(_collider)
    });
}

function setup() {
    scene.starters.map( function(l) {
        l.apply(_collider)
    });
    console.log('scene is ready')
    scene.ready = true
}

// process input events (controls, random, AI)
function input(delta) {
    if (scene.pause) return

    // execute handlers
    scene.handlers.map( function(h) {
        h.apply(_collider, [delta])
    });
    // handle focused entities
    scene.entities.map( function(e) {
        if (scene.isFun(e.handle)) {
            if (e.focus) {
                e.handle(_collider, delta)
            }
        }
    });
}

function evolve(delta) {
    if (scene.pause) return
    // collide
    scene.entities.map( function(e) {
        if (e.alive && e.solid) {
            scene.entities.map( function (t) {
                if (t.alive && t.solid && t.touch && t !== e) {
                    if (t.touch(e)) {
                        if (t.collide) t.collide(e, delta)
                        if (e.collide) e.collide(t, delta)
                    }
                }
            })
        }
    })

    // execute scene mutators
    scene.mutators.map( function(m) {
        m.apply(_collider, [delta])
    });

    // mutate entities
    scene.entities.map( function(e) {
        if (scene.isFun(e.mutate)) {
            if (e.alive) {
                e.mutate(_collider, delta)
            }
        }
    })

    // behave
    scene.entities.map( function(e) {
        if (e.bot && scene.isFun(e.behave)) {
            if (e.alive) {
                e.behave(_collider, delta)
            }
        }
    })
}

var fps = 0, fpsa = 1, fpsc = 0
function render(delta) {
    // clear
    ctx.fillStyle = "#F0C899"
    ctx.fillRect(0,0,cnv.width,cnv.height)
    scene.camera.width = cnv.width
    scene.camera.height = cnv.height

    
    if (!scene.ready) {
        // we are not ready yet...
        ctx.fillStyle = "#A56931"
        ctx.font = '32px antic-bold'
        ctx.textBaseline = 'bottom'
        var loadingStatus = 'Initializing'
        if (scene.resIncluded > 0) {
          loadingStatus = 'Loading ' + (Math.round((scene.resLoaded/scene.resIncluded) * 100))
        }
        var tw = ctx.measureText(loadingStatus).width / 2
        ctx.fillText(loadingStatus, cnv.width/2 - tw, cnv.height/2 - 12)
        return false
    }

    // draw ground
    ctx.fillStyle = "#9B8976"
    ctx.fillRect(0, -scene.camera.y+2, scene.camera.width, 4)

    // translate to camera view
    ctx.translate(scene.camera.x * -1, scene.camera.y * -1)
    if (scene.camera.rotation !== 0) {
        ctx.rotate(scene.camera.rotation)
    }
    if (scene.camera.scale !== 1) {
        ctx.scale(scene.camera.scale, scene.camera.scale)
    }

    // execute painters
    scene.painters.map( function(p) {
        p.apply(_collider, [ctx, delta])
    });

    // paint entities by Z-order
    for (var z = scene.maxZ; z >= 0; z--) {
        scene.entities.map( function(e) {
            if (scene.isFun(e.draw)) {
                if (e.alive && e.visible) {
                    // cooling
                    if (e.x + e.width < scene.camera.x || e.x - e.width > scene.camera.x + scene.camera.width) {
                        ;// cool
                    } else {
                        if (e.Z) {
                            if (e.Z === z) e.draw(ctx, delta, collider)
                        } else {
                            if (z === 0) e.draw(ctx, delta, collider)
                        }
                    }
                }
            }
        });
    }

    // back from camera view to origins
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    if (scene.panel) {
        scene.panel.draw(ctx, delta)
    }

    if (scene.showStatus) {
        // draw status
        ctx.fillStyle = "#A56931"
        ctx.font = '20px antic'
        ctx.textBaseline = 'bottom'

        if (fpsa >= 1 && delta > 0) {
            fps = Math.round(fpsc/fpsa)
            fpsa = delta
            fpsc = 1
        } else {
            fpsc += 1
            fpsa += delta
        }

        var status = 'fps: ' + fps + 'res ' + scene.resIncluded + '/' + scene.resLoaded
            +' mouse: ' + scene.mouseX + 'x' + scene.mouseY + ', ' + scene.mouseButton
            + " Keyboard: "
        for (var k in scene.keys) {
            if (scene.keys[k]) status += "-" + k
        }
        status += '-'
        ctx.fillText(status, 400, 30)

        var status2 = '' + Math.round(scene.camera.x) + 'x' + Math.round(scene.camera.y) + ' -> ' + Math.round(scene.camera.target.x) + 'x' + Math.round(scene.camera.target.y) + ' speed: ' + Math.round(scene.camera.target.dx) + ' entities: ' + scene.entities.length

        ctx.fillText(status2, 400, 60) 

        if (scene.globalStatus) {
            ctx.fillText(scene.globalStatus, 10, 150)
        }
    }

    if (scene.pause) {
        ctx.fillStyle = "#A56931"
        ctx.font = '32 antic-bold'
        ctx.textBaseline = 'bottom'
        var message = 'Pause'
        var tw = ctx.measureText(message).width / 2
        ctx.fillText(message, cnv.width/2 - tw, cnv.height/2 - 12)
    }
}


function loop() {
    var now = Date.now()
    var delta = (now - lastFrame)/1000

    // show, react and update cycle
    render(delta)
    
    if (scene.ready) {
        input(delta)
        // evolve multiple times in small quants
        // to compensate possible lag due to rendering delays
        while(delta > 0) {
            if (delta > MAX_EVO_TIME) {
                evolve(MAX_EVO_TIME);
            } else {
                evolve(delta);
            }
            delta -= MAX_EVO_TIME
        }
    }
    lastFrame = now
}

// bind to events
window.addEventListener('resize', expandCanvas, false)
window.onload = init;
window.onmousemove = handleMouse
window.onmousedown = handleMouseDown
window.onmouseup = handleMouseUp
window.onmouseout = handleMouseOut
window.ondblclick = handleMouseDoubleClick
window.oncontextmenu = handleContextMenu
window.onkeydown = handleKeyDown
window.onkeyup = handleKeyUp

_collider['scene'] = scene

_collider['lib'] = {
    mix: function() {
        var arg, prop, mixin = {};
        for (arg = 0; arg < arguments.length; arg++) {
            for (prop in arguments[arg]) {
                if (arguments[arg].hasOwnProperty(prop)) {
                    mixin[prop] = arguments[arg][prop];
                }
            }
        }
        return mixin;
    },
    augment: function() {
        var arg;
        var prop;
        var mixin = arguments[0];
        for (arg = 1; arg < arguments.length; arg++) {
            for (prop in arguments[arg]) {
                mixin[prop] = arguments[arg][prop];
            }
        }
        return mixin;
    },
}

_collider['math'] = {
    
    PI2: Math.PI * 2,
    
    length: function(x, y) {
        return Math.sqrt(x*x + y*y)
    },

    // get normalized vector as array
    normalize: function(x, y) {
        var len = this.length(x, y)
        if (len === 0) return [0, 0];
        return [x/len, y/len]
    },

    distance: function(x1, y1, x2, y2) {
        var dx = x2 - x1
        var dy = y2 - y1
        return Math.sqrt(dx*dx + dy*dy)
    },

    distanceSq: function(x1, y1, x2, y2) {
        var dx = x2 - x1
        var dy = y2 - y1
        return dx*dx + dy*dy
    },

    distanceToSegmentSq: function(px, py, x1, y1, x2, y2) {
        segLen2 = this.distanceSq(x1, y1, x2, y2)
        if (segLen2 === 0) return this.distanceSq(px, py, x1, y1)
        var t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / segLen2
        if (t < 0) return this.distanceSq(px, py, x1, y1)
        if (t > 1) return this.distanceSq(px, py, x2, y2)
        return this.distanceSq(px, py, x1 + t*(x2 - x1), y1 + t*(y2 - y1))
    },

    distanceToSegment: function(px, py, x1, y1, x2, y2) {
        return Math.sqrt(this.distanceToSegmentSq(px, py, x1, y1, x2, y2))
    },


    // angle from source to target vectors
    targetAngle: function(sx, sy, tx, ty) {
        return Math.atan2(tx - sx, ty - sy)
    },

    normalizeAngle: function(a) {
        a = a % (2*Math.PI)
        return a < 0? a + 2*Math.PI : a
    },

    reverseAngle: function(a) {
        a = (a + Math.PI) % (2*Math.PI)
        return a < 0? a + 2*Math.PI : a
    },

    limitedAdd: function(val, q, max) {
        return Math.min(val+q, max)
    },

    limitedSub: function(val, q, min) {
        return Math.max(val-q, min)
    },

    limitVal: function(val, min, max) {
        return val < min? min : val > max? max : val
    },

    limitMin: function(val, min) {
        return val < min? min : val
    },

    limitMax: function(val, max) {
        return val > max? max : val
    },

    targetVal: function(val, delta, target) {
        if (val === target) return val
        if (val < target) {
            val += delta
            if (val > target) return target
        } else {
            val -= delta
            if (val < target) return target
        }
        return val
    },

    wrap: function(val, min, max) {
        var range = max - min
        if (range <= 0) return 0;
        var res = (val - min) % range
        if (res < 0) res += range;
        return res + min
    },

    // linear interpolation value for v1 and v2 and t[0..1]
    linear: function(v1, v2, t) {
        return (v2 - v1) * t + v1
    },

    // useful for interception of moving objects
    dotProduct: function(x1, y1, x2, y2) {
        return x1*x2 + y1*y2
    },

    // get vector's angle in rad
    vecAngle: function(x, y) {
        return Math.atan2(y, x)
    },

    // get unit vector x from angle
    vecX: function(a) {
        return Math.cos(a)
    },

    // get unit vector y from angle
    vecY: function(a) {
        return Math.sin(a)
    },

    degToRad: function(d) {
        return d * (Math.PI / 180)
    },

    radToDeg: function(r) {
        return r * (180 / Math.PI)
    },

}


return _collider;

}(this))
