/* Boid prototype */

function Boid(swarm, x, y, color, radius ) {
    this.x = x;
    this.y = y;
    this.heading = Math.random() * 2 * Math.PI - Math.PI;
    this.color = color;
    this.radius = radius;
    this.speed = 12;
}

Boid.prototype.radialSpeed = Math.PI / 15;
Boid.prototype.vision = 100;

Boid.prototype.draw = function(ctx) {
    ctx.beginPath();
    ctx.globalAlpha=1;
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, 1.9 * Math.PI);
    ctx.fill();
};

Boid.prototype.distance = function(boid, width, height) {
    var x0 = Math.min(this.x, boid.x), x1 = Math.max(this.x, boid.x);
    var y0 = Math.min(this.y, boid.y), y1 = Math.max(this.y, boid.y);
    var dx = Math.min(x1 - x0, x0 + width - x1);
    var dy = Math.min(y1 - y0, y0 + height - y1);
    return Math.sqrt(dx * dx + dy * dy);
};

Boid.prototype.getNeighbors = function(swarm) {
    var w = swarm.width, h = swarm.height;
    var neighbors = [];
    for (var i = 0; i < swarm.boids.length; i++) {
        var boid = swarm.boids[i];
        if (this !== boid && this.distance(boid, w, h) < this.vision) {
            neighbors.push(boid);
        }
    }
    return neighbors;
};

Boid.wrap = function(value) {
    var min, max;
    if (arguments.length === 2) {
        min = 0;
        max = arguments[1];
    } else if (arguments.length === 3) {
        min = arguments[1];
        max = arguments[2];
    } else {
        throw new Error('wrong number of arguments');
    }
    while (value >= max) value -= (max - min);
    while (value < min) value += (max - min);
    return value;
};

Boid.clamp = function(value, limit) {
    return Math.min(limit, Math.max(-limit, value));
};

Boid.meanAngle = function() {
    var sumx = 0, sumy = 0, len = arguments.length;
    for (var i = 0; i < len; i++) {
        sumx += Math.cos(arguments[i]);
        sumy += Math.sin(arguments[i]);
    }
    return Math.atan2(sumy / len, sumx / len);
};

Boid.prototype.step = function(swarm) {
    var w = swarm.width, h = swarm.height;
    //check for attractor
    if( swarm.attractor != null) {
      target = Math.atan2(swarm.predator.y - this.y, swarm.predator.x - this.x);
      // Move in this direction
      var delta = Boid.wrap(target - this.heading, -Math.PI, Math.PI);
      delta = Boid.clamp(delta, this.radialSpeed);
      this.heading = Boid.wrap(this.heading + delta, -Math.PI, Math.PI);
      this.move(swarm);
      return;
    }

    //check for predator
    if( swarm.predator != null) {
      //if predator in visual range
      if( this.distance( swarm.predator, w, h) < this.vision) {
        target = Math.atan2(this.y - swarm.predator.y, this.x - swarm.predator.x);
        // Move in this direction
        var delta = Boid.wrap(target - this.heading, -Math.PI, Math.PI);
        delta = Boid.clamp(delta, this.radialSpeed);
        this.heading = Boid.wrap(this.heading + delta, -Math.PI, Math.PI);
        this.move(swarm);
        return;
      }
    }

    //check for neighbors
    var neighbors = this.getNeighbors(swarm);
    if (neighbors.length > 0) {
        var meanhx = 0, meanhy = 0;
        var meanx = 0, meany = 0;
        var mindist = this.radius * 2, min = null;
        for (var i = 0; i < neighbors.length; i++) {
            var boid = neighbors[i];
            meanhx += Math.cos(boid.heading);
            meanhy += Math.sin(boid.heading);
            meanx += boid.x;
            meany += boid.y;
            var dist = this.distance(boid, w, h);
            if (dist < mindist) {
                mindist = dist;
                min = boid;
            }
        }
        meanhx /= neighbors.length;
        meanhy /= neighbors.length;
        meanx /= neighbors.length;
        meany /= neighbors.length;

        var target;
        if (min) {
            // Keep away!
            target = Math.atan2(this.y - min.y, this.x - min.x);
        } else {
            // Match heading and move towards center
            var meanh = Math.atan2(meanhy, meanhx);
            var center = Math.atan2(meany - this.y, meanx - this.x);
            target = Boid.meanAngle(meanh, meanh, meanh, center);
        }

        // Move in this direction
        var delta = Boid.wrap(target - this.heading, -Math.PI, Math.PI);
        delta = Boid.clamp(delta, this.radialSpeed);
        this.heading = Boid.wrap(this.heading + delta, -Math.PI, Math.PI);
    }

    this.move(swarm);
};

Boid.prototype.move = function(swarm) {
    var padding = swarm.padding;
    var width = swarm.width, height = swarm.height;
    var speed = this.speed;
    this.x = Boid.wrap(this.x + Math.cos(this.heading) * speed,
                       -padding, width + padding * 2);
    this.y = Boid.wrap(this.y + Math.sin(this.heading) * speed,
                       -padding, height + padding * 2);
};

/* Predator prototype */

function Predator( sx, sy) {
  this.x = sx;
  this.y = sy;
  this.updateLoc = function( x, y) {
    this.x = x;
    this.y = y;
  }
}

/* Attractor prototype */

function Attractor( sx, sy) {
  this.x = sx;
  this.y = sy;
  this.updateLoc = function( x, y) {
    this.x = x;
    this.y = y;
  }
}

/* DestroyBit prototype */

var destroyBitsFactor = 3.0; //percent of boid.radius to create when destroyed
var destroySpeedMin = 5;
var destroySpeedMax = 10;
var destroyDistanceMin = 50;
var destroyDistanceMax = 192;
var destroySizeMax = 4;
var destroySizeMin = 2;

function DestroyBit( boid){ 
  this.size = Math.floor(Math.random() * (destroySizeMax - destroySizeMin + 1)) + destroySizeMin;
  this.speed = Math.floor( (Math.random() * destroySpeedMax) + destroySpeedMin);
  this.lifeDistance = Math.floor( (Math.random() * destroyDistanceMax) + destroyDistanceMin);

  this.swarm = boid.swarm;
  this.originX = boid.x;
  this.originY = boid.y;
  this.x = boid.x;
  this.y = boid.y;
  this.heading = Math.random() * 2 * Math.PI - Math.PI;
  this.color = boid.color;
  this.move = function( swarm) {
    //check distance. if past this.lifeDistance, then return false to destroy bit
    if( Math.sqrt( Math.pow((this.originX-this.x),2) + Math.pow((this.originY-this.y),2)) >= this.lifeDistance) {
      return false;
    }
    var width = swarm.width, height = swarm.height;
    var speed = this.speed;
    this.x = this.x + Math.cos(this.heading) * speed;
    this.y = this.y + Math.sin(this.heading) * speed;
    return true;
  }
  this.draw = function( ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect( this.x, this.y, this.size, this.size);
  }
}


/* Swam prototype. */

function Swarm(ctx) {
  this.ctx = ctx;
  this.boids = [];
  this.destroyBits = [];
  var swarm = this;
  this.predator = null;
  this.attractor = null;
  this.padding = 4;

  //functions
  this.animate = function() {
      Swarm.step(swarm);
  };
  this.updatePredatorLoc = function( x, y) {
    if( this.predator == null) {
      this.predator = new Predator( x, y);
    } else {
      this.predator.updateLoc( x, y);
    }
  };
  this.updateAttractorLoc = function( x, y) {
    if( this.attractor == null) {
      this.attractor = new Attractor( x, y);
    } else {
      this.attractor.updateLoc( x, y);
    }
  };
  this.setDestructionAtPoint = function( x, y) {
    for(var i=this.boids.length-1; i>=0; i--){
      if( Math.abs(this.boids[i].x-x) < this.boids[i].radius && Math.abs(this.boids[i].y-y) < this.boids[i].radius) {
        this.setDestruction( this.boids[i]);
        this.boids.splice( i, 1);
      }
    }
  };
  this.setDestruction = function( boid) {
    for( var numBits = Math.floor(boid.radius*destroyBitsFactor); numBits>=0; numBits--) {
      this.destroyBits.push( new DestroyBit( boid));
    }
  };
}

Swarm.prototype.defaultBoidSize = 3;


Swarm.prototype.addPersonal = function() {
  //find personal
  for( var i = 0; i < this.boids.length; i++ ) {
    if( this.boids[i].isPersonal) {
      return;
    }
  }
  var pers = new Boid( this, this.width/2, this.height/2, "#00fcff", 11);
  pers.speed = 0;
  this.boids.push(pers);
  window.setTimeout( function() {
    pers.speed = 13;
  }, 1000);
}

Swarm.prototype.createBoids = function(n) {
    //reduce number depending on area
    /*var idealArea = 600*1150;
    if( this.width * this.height < idealArea) {
      n = Math.floor(n * ((this.width*this.height)/idealArea));
    }*/
    for (var i = 0; i < n; i++) {
        this.boids.push(new Boid(this, this.width/2, this.height/2, '#006a6b', this.defaultBoidSize));
    }
};

Swarm.prototype.clear = function() {
    this.boids = [];
};

Object.defineProperty(Swarm.prototype, 'width', {get: function() {
    return this.ctx.canvas.width;
}});

Object.defineProperty(Swarm.prototype, 'height', {get: function() {
    return this.ctx.canvas.height;
}});

Swarm.prototype.getZPath = function( ctx) {
  ctx.beginPath();
  ctx.moveTo( 565, 210);
  ctx.lineTo( 565, 80);
  ctx.lineTo( 870, 80);
  ctx.arcTo( 950, 78, 890, 182, 50);
  ctx.lineTo( 667, 606);
  ctx.lineTo( 920, 606);
  ctx.lineTo( 920, 665);
  ctx.lineTo( 605, 665);
  ctx.arcTo( 558, 665, 558, 600, 50);
  ctx.lineTo( 558, 605);
  ctx.lineTo( 800, 132);
  ctx.lineTo( 653, 132);
  ctx.arcTo( 603, 132, 603, 200, 50);
  ctx.lineTo( 603, 210);
  ctx.closePath();
};

Swarm.step = function (swarm) {
    var ctx = swarm.ctx;
    ctx.canvas.width = ctx.canvas.parentElement.clientWidth;
    ctx.canvas.height = ctx.canvas.parentElement.clientHeight;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, swarm.width, swarm.height);

    for (var i = 0; i < swarm.boids.length; i++) {
        swarm.boids[i].step(swarm);
        swarm.boids[i].draw(ctx);
    }

    for (var i = swarm.destroyBits.length-1; i >= 0; i--) {
      if( !swarm.destroyBits[i].move( swarm)) {
        swarm.destroyBits.splice( i, 1);
      } else {
        swarm.destroyBits[i].draw(ctx);
      }
    }
};

Swarm.prototype.placePatternedBoids = function( num) {
  var ctx = this.ctx;
  this.getZPath( ctx);
  var xmin=565;
  var xmax=920;
  var ymin=80;
  var ymax=665;
  for( var i=0; i<num; i++) {
    var x = Math.floor((Math.random() * (xmax-xmin))+xmin);
    var y = Math.floor((Math.random() * (ymax-ymin))+ymin);
    while( !ctx.isPointInPath( x, y)) {
      x = Math.floor((Math.random() * (xmax-xmin))+xmin);
      y = Math.floor((Math.random() * (ymax-ymin))+ymin);
    }
    this.boids.push( new Boid( this, x, y));
  }
};

var attractorTimeout = function() {
  if( swarm.attractor != null) {
    swarm.setDestructionAtPoint( swarm.predator.x, swarm.predator.y);
    window.setTimeout( attractorTimeout, 1500);
  }
}

var swarm;
$(document).ready( function() {
    var canvas = document.getElementById('boidsCanvas');
    swarm = new Swarm( canvas.getContext('2d'));
    swarm.id = setInterval( swarm.animate, 33);
    swarm.animate();
    swarm.clear();

    $("#boidsCanvas").on("mousemove", function(e) {
      swarm.updatePredatorLoc( e.offsetX, e.offsetY);
    });
    $("#boidsCanvas").on("mouseout", function() {
      swarm.predator = null;
      swarm.attractor = null;
    });
    $("#boidsCanvas").on("mousedown", function(e) {
      swarm.updateAttractorLoc( e.offsetX, e.offsetY);
      window.setTimeout( attractorTimeout, 4000);
    });
    $("#boidsCanvas").on("mouseup", function(e) {
      swarm.attractor = null;
      swarm.setDestructionAtPoint( e.offsetX, e.offsetY);
    });
    $("#boidsCanvas").on("mouseup", function(e) { 
      swarm.attractor = null;
    });
});
