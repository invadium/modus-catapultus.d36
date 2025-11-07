"use strict"

function Camera() {
    this.MAX_DX = 250
    this.MAX_DY = 250
    this.ACCX = 150
    this.ACCY = 500 
    this.BRAKEX = 250
    this.BRAKEY = 250
    this.BASE_FACTOR = 0.7
    this.BASE_MARGIN = 0.05
    this.LEFT_MARGIN = 0.1
    this.RIGHT_MARGIN = 0.6
    this.height = 600
    this.width = 800

    this._$entity_ = true
    this.alive = true
    this.visible = false
    this.kind = 'camera'
    this.name = 'targeting camera'
    this.focus = false

    this.x = 0
    this.y = 0
    this.scale = 1
    this.rotation = 0
    this.dx = 0
    this.dy = 0
    this.target = this

    this.handle = function(collider, delta) {
    }

    this.mutate = function(collider, delta) {
        var hshift = this.width / 2

        if (this.target.x - this.x < this.LEFT_MARGIN*this.width) {
            if (this.target.x - this.x > this.LEFT_MARGIN*this.width/2) {
                this.dx = this.target.dx
            } else {
                this.dx = collider.math.limitMin(this.dx - this.ACCX*delta, -this.MAX_DX)
            }
        } else if (this.target.x - this.x - this.width + this.RIGHT_MARGIN*this.width > 0) {
            if (this.target.x - this.x - this.width + this.RIGHT_MARGIN*this.width/2 < 0) {
                this.dx = this.target.dx
            } else {
                this.dx = collider.math.limitMax(this.dx + this.ACCX*delta, this.MAX_DX)
            }
        } else {
            // brake x
            this.dx = collider.math.targetVal(this.dx, this.BRAKEX*delta, 0)
        }

        var base = this.height * this.BASE_FACTOR
        var margin = this.height * this.BASE_MARGIN
        if (this.target.y - this.y - base + margin < 0) {
            this.dy = collider.math.limitMin(this.dy - this.ACCY*delta, -this.MAX_DY)
        } else if (this.target.y - this.y - base - margin > 0) {
            this.dy = collider.math.limitMax(this.dy + this.ACCY*delta, this.MAX_DY)
        } else {
            // brake y
            this.dy = collider.math.targetVal(this.dy, this.BRAKEY*delta, 0)
        }

        this.x += this.dx * delta;
        this.y += this.dy * delta;
        
    }
}
