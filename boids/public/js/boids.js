var calculateDistance = function(object1, object2){
  x = Math.abs(object1.x - object2.x);
  y = Math.abs(object1.y - object2.y);

  return Math.sqrt((x * x) + (y * y));
};

var calcMagnitude = function(x, y) {
  return Math.sqrt((x * x) + (y * y));
};

var calcVectorAdd = function(v1, v2, ease = 1.0) {
  return {x: v1.x + v2.x * ease, y: v1.y + v2.y * ease};
};

var calcVectorSubtract = function(v1, v2) {
  let v = {
    x: v1.x,
    y: v1.y,
  };
  v.x -= v2.x;
  v.y -= v2.y;
  return v;
};

function calcVectorMult(v, scalar) {
  let p = {
    x: v.x * scalar,
    y: v.y * scalar,
  };
  return p;
}

var calcVectorLerp = function(v1, v2, interpolate = 0.5) {
  return {
    x: v1.x * (1 - interpolate) + v2.x * interpolate,
    y: v1.y * (1 - interpolate) + v2.y * interpolate,
  }
}

var calcVectorNorm = function(v) {
  var magnitude = calcMagnitude(v.x, v.y);
  return {
    x: v.x / magnitude,
    y: v.y / magnitude,
    mag: 1
  };
}

function calcOrthogonalVector(v) {
  let ortho = {
    x: -1 * v.y,
    y: v.x,
  }
  return calcVectorNorm(ortho);
}

function calcVectorAngle(v) {
  var angle = Math.atan2(v.y, v.x);
  return (2 * Math.PI + angle) % 2 * Math.PI;
}

var random = function( min, max ) {

  return min + Math.random() * ( max - min );
};

var getRandomItem = function(list, weight) {
  var total_weight = weight.reduce(function (prev, cur, i, arr) {
    return prev + cur;
  });
  var random_num = random(0, total_weight);
  var weight_sum = 0;
  for (var i = 0; i < list.length; i++) {
    weight_sum += weight[i];
    weight_sum = +weight_sum.toFixed(2);
      
    if (random_num <= weight_sum) {
      return list[i];
    }
  }
};

/***********************
BOID
***********************/
function Boid(x, y, segmentSize) {
  this.init(x, y, segmentSize);
}

const OSCILLATION_PERIOD = 50;
const OSCILLATION_AMPLITUDE = 3;
const MARGIN_BUFFER = 100;

const BOID_SEGMENTS = [.2, .5, .8, .9, .7, .5, .3, .1];

Boid.prototype = {
  init: function(x, y) {
    //body
    this.type = "boid";
    this.health = 1;
    this.maturity = 4;
    this.speed = 1.6;
    this.size = 5 * ~~random(70, 100) / 100.0;
    this.hungerLimit = 12000;
    this.hunger = 0;
    this.isFull = false;
    this.digestTime = 400;
    this.color = 'rgb(' + ~~random(0,100) + ',' + ~~random(50,220) + ',' + ~~random(50,220) + ')';
    this.segmentSize = BOID_SEGMENTS;
    this.sizeMult = 1;
  
    this.oscillationPeriod = ~~random(80, 120) / 100.0 * OSCILLATION_PERIOD * this.size / 3;
    this.oscillationAmplitude = ~~random(80, 120) / 100.0 * OSCILLATION_AMPLITUDE * this.size / 5;

    //brains
    this.eyesight = 100; //range for object dectection
    this.personalSpace = 15; //distance to avoid safe objects
    this.flightDistance = 60; //distance to avoid scary objects
    this.flockDistance = 1000; //factor that determines how attracted the boid is to the center of the flock
    this.matchVelFactor = 4; //factor that determines how much the flock velocity affects the boid. less = more matching
    this.momentum = .25;
    this.angMomentum = 0.1;
    this.separationScale = 0.2;
    this.maxAccel = 1;
  
    this.x = x || 0.0;
    this.y = y || 0.0;

    this.v = {
      x: random(-1, 1),
      y: random(-1, 1),
      mag: 0
    };
    this.acc = {
      x: 0,
      y: 0,
    }
    this.heading = this.v;

    this.unitV = {
      x: 0,
      y: 0,
    };

    this.v.mag = calcMagnitude(this.v.x, this.v.y);
    this.unitV.x = (this.heading.x / this.heading.mag);
    this.unitV.y = (this.heading.y / this.heading.mag);

    // Track and draw segments.
    this.phase = Math.random() * 2 * Math.PI;
    this.initSegments();
  },
  initSegments: function() {
    this.segments = [{
      x: this.x,
      y: this.y,
    }];
    let headingAngle = calcVectorAngle(this.heading);
    for (var i = 1; i < this.segmentSize.length; i++) {
      this.segments.push({
        x: this.segments[i - 1].x + this.size * Math.cos(headingAngle),
        y: this.segments[i - 1].y + this.size * Math.sin(headingAngle)
      })
    }
  },
  ai: function(boids, index, ctx, dt) {
    perceivedCenter = {
      x: 0,
      y: 0,
      count: 0
    };
    perceivedVelocity = {
      x: 0,
      y: 0,
      count: 0
    };
    mousePredator = {
      x: ((typeof ctx.touches[0] === "undefined") ? 0 : ctx.touches[0].x),
      y: ((typeof ctx.touches[0] === "undefined") ? 0 : ctx.touches[0].y)
    };
      
    for (var i = 0; i < boids.length; i++) {
      if (i != index) {
        dist = calculateDistance(this, boids[i]);
        //Find all other boids close to it
        if (dist < this.eyesight) {
          //if the same species then flock
          if (boids[i].type == this.type) {
            // Alignment.
            perceivedCenter.x += boids[i].x;
            perceivedCenter.y += boids[i].y;
            perceivedCenter.count++;

            // Cohesion.
            perceivedVelocity.x += boids[i].v.x;
            perceivedVelocity.y += boids[i].v.y;
            perceivedVelocity.count++;

            // Separation.
            if (dist < this.personalSpace + this.size) {
              this.avoidOrAttract("avoid", boids[i], this.separationScale);
            }
          } else {
            this.handleOther(boids[i]);
          }
        }
      }
    }

    //Get the average for all near boids
    if (perceivedCenter.count > 0) {
      perceivedCenter.x = ((perceivedCenter.x / perceivedCenter.count) - this.x) / this.flockDistance;
      perceivedCenter.y = ((perceivedCenter.y / perceivedCenter.count) - this.y) / this.flockDistance;
    }
    if (perceivedVelocity.count > 0) {
      perceivedVelocity.x = ((perceivedVelocity.x / perceivedVelocity.count) - this.v.x) / this.matchVelFactor;
      perceivedVelocity.y = ((perceivedVelocity.y / perceivedVelocity.count) - this.v.y) / this.matchVelFactor;
    }

    this.acc = calcVectorAdd(this.acc, calcVectorAdd(perceivedCenter, perceivedVelocity), 1 - this.momentum);
    //Avoid Mouse
    if (calculateDistance(mousePredator, this) < this.eyesight) {
      var mouseModifier = 20;
      this.avoidOrAttract("avoid", mousePredator, mouseModifier);
    }
    this.limitAcceleration();
    const massConstant = .001;
    this.v = {
      x: this.v.x + this.acc.x * dt / (this.size * massConstant),
      y: this.v.x + this.acc.y * dt / (this.size * massConstant),
    }
    this.limitVelocity();
  },
  setUnitVector: function() {
    var magnitude = calcMagnitude(this.v.x, this.v.y);
    this.v.x = this.v.x / magnitude;
    this.v.y = this.v.y / magnitude;
  },
  limitVelocity: function() {
    this.v.mag = calcMagnitude(this.v.x, this.v.y);
    this.unitV.x = (this.v.x / this.v.mag);
    this.unitV.y = (this.v.y / this.v.mag);

    if (this.v.mag > this.speed) {
      this.v.x = this.unitV.x * this.speed;
      this.v.y = this.unitV.y * this.speed;
    }
  },
  limitAcceleration: function() {
    if (calcMagnitude(this.acc.x, this.acc.y) > this.maxAccel) {
      this.acc = calcVectorMult(calcVectorNorm(this.acc), this.maxAccel);
    }
  },
  avoidOrAttract: function(action, other, modifier) {
    var newVector = {x: 0, y: 0};
    var direction = ((action === "avoid") ? -1 : 1);
    var distance = calculateDistance(this, other);
    var dModifier = (this.eyesight - distance) / this.eyesight;
    var vModifier = (modifier || 1) * dModifier;
    newVector.x += ( (other.x - this.x) * vModifier ) * direction;
    newVector.y += ( (other.y - this.y) * vModifier ) * direction;
    this.acc = calcVectorAdd(this.acc, newVector, 1 - this.momentum);
  },
  move: function(ctx, dt) {
    this.heading = calcVectorLerp(this.heading, calcVectorNorm(this.v), this.angMomentum);
    this.heading = calcVectorNorm(this.heading);
    var speed = calcMagnitude(this.v.x, this.v.y);
    this.x += this.heading.x * speed;
    this.y += this.heading.y * speed;
    if (this.x > ctx.width + MARGIN_BUFFER) {
      this.x = this.x - ctx.width - 2 * MARGIN_BUFFER;
      this.shiftSegments();
    } else if (this.x < -MARGIN_BUFFER) {
      this.x = this.x + ctx.width + 2 * MARGIN_BUFFER;
      this.shiftSegments();
    }
    if (this.y > ctx.height + MARGIN_BUFFER) {
      this.y = this.y - ctx.height - 2 * MARGIN_BUFFER;
      this.shiftSegments();
    } else if (this.y < -MARGIN_BUFFER) {
      this.y = this.y + ctx.height + 2 * MARGIN_BUFFER;
      this.shiftSegments();
    }
    // this.x = (this.x + ctx.width) % ctx.width;
    // this.y = (this.y + ctx.height) % ctx.height;
    if (this.v.mag > this.speed) {
      this.hunger += this.speed;    
    } else {
      this.hunger += this.v.mag;
    } 
    this.updateSegments(dt);
  },
  eat: function(other) {
    if (!this.isFull) {
      if (other.type === "plant") {
        other.health--;
        this.health++;
        this.isFull = true;
        this.hunger = 0;
      }
    }
  },
  handleOther: function(other) {
    if (other.type === "predator") {
      this.avoidOrAttract("avoid", other);
    }
  },
  draw: function( ctx ) {
    drawSize = this.size;
    // ctx.beginPath();
    // ctx.moveTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
    // ctx.lineTo( this.x + ( this.unitV.y * drawSize ), this.y - ( this.unitV.x * drawSize ));
    // ctx.lineTo( this.x - ( this.unitV.x * drawSize * 3 ), this.y - ( this.unitV.y * drawSize * 3 ));
    // ctx.lineTo( this.x - ( this.unitV.y * drawSize ), this.y + ( this.unitV.x * drawSize ));
    // ctx.lineTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
    // ctx.fillStyle = 'rgba(0,0,0,.4)';
    // ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segmentSize.length; i++) {
      var diff = calcVectorSubtract(this.segments[i - 1], this.segments[i]);
      let ortho = calcVectorMult(calcOrthogonalVector(diff), this.segmentSize[i] * this.size * this.sizeMult);
      let point = calcVectorAdd(this.segments[i], ortho);
      ctx.lineTo(point.x, point.y);
    }
    for (let i = this.segmentSize.length - 1; i > 0; i--) {
      var diff = calcVectorSubtract(this.segments[i], this.segments[i - 1]);
      let ortho = calcVectorMult(calcOrthogonalVector(diff), this.segmentSize[i] * this.size * this.sizeMult);
      let point = calcVectorAdd(this.segments[i], ortho);
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(this.segments[0].x, this.segments[0].y);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 2;
    ctx.shadowColor = this.color;
    ctx.fill();
  },
  updateSegments: function(dt) {
    let prevFirstSeg = this.segments[0];
    this.segments[0] = {
      x: this.x,
      y: this.y,
    }

    let bodyPhaseOffset = this.segmentSize.length / 2 * Math.PI;
    let bodyOscillationAmplitude = 1.25;
    let speedMult = calcMagnitude(this.v.x, this.v.y) / this.speed;
    
    let sineVal = Math.sin(Date.now()/this.oscillationPeriod + this.phase) * this.oscillationAmplitude * speedMult;
    let orthoVector = calcOrthogonalVector(this.v);
    orthoVector = calcVectorMult(orthoVector, sineVal);
    this.segments[0] = calcVectorAdd({x: this.x, y: this.y}, orthoVector);
    // Limit rendered movement.
    const DLIMIT = 2;
    let ds = {
      x: this.segments[0].x - prevFirstSeg.x,
      y: this.segments[0].y - prevFirstSeg.y,
    };
    if (calcMagnitude(ds.x, ds.y) > DLIMIT) {
      ds = calcVectorMult(calcVectorNorm(ds), DLIMIT);
      this.segments[0] = {
        x: prevFirstSeg.x + ds.x,
        y: prevFirstSeg.y + ds.y,
      };
    }
    
    for (let i = 1; i < this.segmentSize.length; i++) {
      var diff = calcVectorSubtract(this.segments[i - 1], this.segments[i]);
      let ortho = calcOrthogonalVector(diff);
      let waveOffset = Math.sin(Date.now()/this.oscillationPeriod + i * bodyPhaseOffset + this.phase) 
        * speedMult * bodyOscillationAmplitude * i / this.segmentSize.length;
      //console.log(waveOffset, diff);
      diff = calcVectorAdd(diff, calcVectorMult(ortho, waveOffset));
      diff = calcVectorMult(calcVectorNorm(diff), this.size);
      this.segments[i] = calcVectorSubtract(this.segments[i - 1], diff);
    }
  },
  shiftSegments: function() {
    // Shifts segments by dx/dy of this.x and this.y.
    let dx = this.x - this.segments[0].x;
    let dy = this.y - this.segments[0].y;
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].x += dx;
      this.segments[i].y += dy;
    }
  }
};

Predator.prototype = new Boid();
Predator.prototype.constructor = Predator;
Predator.constructor = Boid.prototype.constructor;

function Predator(x, y) {
  this.init(x, y);

  this.type = "predator";

  // body
  this.maturity = 6;
  this.speed = 2;
  this.size = ~~random(7, 9);
  this.hungerLimit = 25000;
  const finColorOffset = 10;
  // this.color = 'rgb(' + ~~random(160,200) + ',' + ~~random(10,30) + ',' + ~~random(10,30) + ')';
  let r = ~~random(130,170), g= ~~random(160,200), b = ~~random(200,225);
  // let r = ~~random(100,115), g= ~~random(105,120), b = ~~random(80,95);
  this.angMomentum = 0.07;
  this.color = 'rgb(' + r + ',' + g + ',' + b + ')';
  this.finColor = 'rgb(' + (r - finColorOffset) + ',' + (g - finColorOffset) + ',' + (b - finColorOffset) + ')'; 
  this.oscillationPeriod = OSCILLATION_PERIOD * this.size * 0.85;
  this.oscillationAmplitude = OSCILLATION_AMPLITUDE * this.size * 1.2;
  this.segmentSize = [.3, .5, .7, .9, .93, .96, 1, .85, .8, .75, .64, .53, .5, .4, .22, .15, .18, .13, .1, .08];
  this.sizeMult = 1.5;
  // brains
  this.eyesight = 200;
  this.flockDistance = 2000;
  this.matchVelFactor = 2000; //factor that determines how much the flock velocity affects the boid. less = more matching
  this.separationScale = 1;
  this.personalSpace = 70;
  this.initSegments();
}

Predator.prototype.eat = function(other) {
  if (!this.isFull) {
    if (other.type === "boid") {
      other.health--;
      this.health++;
      this.isFull = true;
      this.hunger = 0;
    }
  }
};

Predator.prototype.handleOther = function(other) {
  if (other.type === "boid") {
    if (!this.isFull) {
      this.avoidOrAttract("attract", other);
    }
  }
};

Predator.prototype.draw = function(ctx) {
  drawSize = this.size;
  // ctx.beginPath();
  // ctx.moveTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
  // ctx.lineTo( this.x + ( this.unitV.y * drawSize ), this.y - ( this.unitV.x * drawSize ));
  // ctx.lineTo( this.x - ( this.unitV.x * drawSize * 3 ), this.y - ( this.unitV.y * drawSize * 3 ));
  // ctx.lineTo( this.x - ( this.unitV.y * drawSize ), this.y + ( this.unitV.x * drawSize ));
  // ctx.lineTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
  // ctx.fillStyle = '#FFF';
  // ctx.fill();

  // ctx.beginPath();
  // ctx.moveTo( this.x + ( this.heading.x * drawSize ), this.y + 50 + ( this.heading.y * drawSize ));
  // ctx.lineTo( this.x + ( this.heading.y * drawSize ), this.y + 50 - ( this.heading.x * drawSize ));
  // ctx.lineTo( this.x - ( this.heading.x * drawSize * 3 ), this.y + 50 - ( this.heading.y * drawSize * 3 ));
  // ctx.lineTo( this.x - ( this.heading.y * drawSize ), this.y + 50 + ( this.heading.x * drawSize ));
  // ctx.lineTo( this.x + ( this.heading.x * drawSize ), this.y + 50 + ( this.heading.y * drawSize ));
  // ctx.fillStyle = 'red';
  // ctx.fill();

    // Draw fins.
  drawFin(this, ctx, 4, 4, .75, true);
  drawFin(this, ctx, 4, 4, .75, false);
  drawFin(this, ctx, 9, 1.5, .3, true);
  drawFin(this, ctx, 9, 1.5, .3, false);
  drawFin(this, ctx, 16, 0.5, .5, false);

  ctx.beginPath();
  let sizeMult = 1.5;
  ctx.moveTo(this.segments[0].x, this.segments[0].y);
  for (let i = 1; i < this.segmentSize.length; i++) {
    var diff = calcVectorSubtract(this.segments[i - 1], this.segments[i]);
    let ortho = calcVectorMult(calcOrthogonalVector(diff), this.segmentSize[i] * this.size * sizeMult);
    let point = calcVectorAdd(this.segments[i], ortho);
    ctx.lineTo(point.x, point.y);
  }
  for (let i = this.segmentSize.length - 1; i > 0; i--) {
    var diff = calcVectorSubtract(this.segments[i], this.segments[i - 1]);
    let ortho = calcVectorMult(calcOrthogonalVector(diff), this.segmentSize[i] * this.size * sizeMult);
    let point = calcVectorAdd(this.segments[i], ortho);
    ctx.lineTo(point.x, point.y);
  }
  ctx.lineTo(this.segments[0].x, this.segments[0].y);
  ctx.fillStyle = this.color;
  ctx.shadowBlur = 2;
  ctx.shadowColor = this.color;
  ctx.fill();

  drawFin(this, ctx, 7, 1, .4, true);
};

function drawFin(boid, ctx, finIdx, finMult, finVertScale, flip) {
  const finDims = [.25, .35, .6, .85, .95, 1];
  ctx.beginPath();
  ctx.moveTo(boid.segments[finIdx].x, boid.segments[finIdx].y);
  var finDiff = calcVectorSubtract(boid.segments[finIdx], boid.segments[finIdx - 1]);
  let finOrtho = calcOrthogonalVector(finDiff)
  finOrtho = flip ? finOrtho : calcVectorMult(finOrtho, -1)
  var finOffset = calcVectorMult(calcVectorNorm(finDiff), boid.size * finVertScale);
  for (let i = 0; i < finDims.length; i++) {
    let ortho = calcVectorMult(finOrtho, finDims[i] * boid.size * finMult);
    let point = calcVectorAdd(calcVectorAdd(boid.segments[finIdx], calcVectorMult(finOffset, i)), ortho);
    ctx.lineTo(point.x, point.y);
  }
  let endFinOrtho = calcVectorMult(finOrtho, .35 * boid.size * finMult);
  let endFinPoint = calcVectorAdd(calcVectorAdd(boid.segments[finIdx], calcVectorMult(finOffset, finDims.length - 2)), endFinOrtho);
  ctx.lineTo(endFinPoint.x, endFinPoint.y);
  
  ctx.lineTo(boid.segments[finIdx].x, boid.segments[finIdx].y);
  ctx.fillStyle = boid.finColor;
  ctx.shadowBlur = 2;
  ctx.shadowColor = boid.color;
  ctx.fill();
}

/***********************
SIM
***********************/
var boids = [];

var sim = Sketch.create({
  container: document.getElementById( 'container' ),
  // interval: 5,
});

sim.setup = function() {
  for ( i = 0; i < 80; i++ ) {
    x = random(0, sim.width);
    y = random(0, sim.height);
    sim.spawn(x, y);
  }
  // Spawn at least two predators;
  sim.spawn(random(0, sim.width), random(0, sim.height), 'predator');
  sim.spawn(random(0, sim.width), random(0, sim.height), 'predator');
};

sim.spawn = function(x, y, type = undefined) {
  var predatorProbability = 0.005;
      
  if (!type) {
    type = getRandomItem(['boid','predator'],[1 - predatorProbability, predatorProbability]);
  }
  switch(type) {
    case 'predator':
      boid = new Predator(x, y);
      break;
    default:
      boid = new Boid(x, y);
      break;
  }
  boids.push( boid );
};

var then = Date.now() / 1000;
sim.update = function() {
  let dt = (Date.now() / 1000) - then;
  for ( i = boids.length - 1; i >= 0; i-- ) {
    boids[i].ai(boids, i, sim, dt);
    boids[i].move(sim, dt);
  }
};

var c = 0;
var fps = 0;
sim.draw = function() {
  for ( i = boids.length - 1; i >= 0; i-- ) {
    boids[i].draw( sim );
  }
  var now = Date.now() / 1000;
  if (c % 50 == 0) {
    fps = 1 / (now - then);
    c = 0;
  }
  then = now;
  sim.fillStyle = 'rgb(100,100,100)';
  sim.shadowBlur = 0;
  sim.fillText('fps: ' + fps.toFixed(2), sim.width - 50, sim.height - 10);
  c++;
};