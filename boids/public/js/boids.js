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
function Boid(x, y) {
  this.init(x, y);
}

const OSCILLATION_PERIOD = 50;
const OSCILLATION_AMPLITUDE = 2;

Boid.prototype = {
  init: function(x, y) {
    //body
    this.type = "boid";
    this.health = 1;
    this.maturity = 4;
    this.speed = 1.6;
    this.size = 5;
    this.hungerLimit = 12000;
    this.hunger = 0;
    this.isFull = false;
    this.digestTime = 400;
    this.color = 'rgb(' + ~~random(0,100) + ',' + ~~random(50,220) + ',' + ~~random(50,220) + ')';

    this.segmentSize = [.1, .35, .55, .68, .85, .92, 1, .92, .85, .8, .75, .64, .53, .5, .4, .33, .25, .2, .1, .05];

    this.oscillationPeriod = OSCILLATION_PERIOD * this.size;
    this.oscillationAmplitude = OSCILLATION_AMPLITUDE * this.size;

    //brains
    this.eyesight = 100; //range for object dectection
    this.personalSpace = 15; //distance to avoid safe objects
    this.flightDistance = 60; //distance to avoid scary objects
    this.flockDistance = 1000; //factor that determines how attracted the boid is to the center of the flock
    this.matchVelFactor = 4; //factor that determines how much the flock velocity affects the boid. less = more matching
    this.momentum = .25;
    this.angMomentum = 0.1;
    this.separationScale = 0.2;
    this.maxAccel = 2.5;
  
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
    if (calcMagnitude(this.acc.x, this.acc.y) > 1) {
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
    const MARGIN_BUFFER = 50;
    if (this.x > ctx.width + MARGIN_BUFFER) {
      this.x = this.x - ctx.width - 2 * MARGIN_BUFFER;
    } else if (this.x < -MARGIN_BUFFER) {
      this.x = this.x + ctx.width + 2 * MARGIN_BUFFER;
    }
    if (this.y > ctx.height + MARGIN_BUFFER) {
      this.y = this.y - ctx.height - 2 * MARGIN_BUFFER;
    } else if (this.y < -MARGIN_BUFFER) {
      this.y = this.y + ctx.height + 2 * MARGIN_BUFFER;
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
    ctx.beginPath();
    ctx.moveTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
    ctx.lineTo( this.x + ( this.unitV.y * drawSize ), this.y - ( this.unitV.x * drawSize ));
    ctx.lineTo( this.x - ( this.unitV.x * drawSize * 3 ), this.y - ( this.unitV.y * drawSize * 3 ));
    ctx.lineTo( this.x - ( this.unitV.y * drawSize ), this.y + ( this.unitV.x * drawSize ));
    ctx.lineTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.fill();
  },
  updateSegments: function(dt) {
    // Update segments.
    // this.segments.unshift({x: this.x, y: this.y});
    // this.segments.pop();
    this.segments[0] = {
      x: this.x,
      y: this.y,
    }

    let bodyPhaseOffset = .3;
    let bodyOscillationAmplitude = 0;
    
    let sineVal = Math.sin(Date.now()/this.oscillationPeriod + this.phase) * this.oscillationAmplitude;
    let orthoVector = calcOrthogonalVector(this.v);
    orthoVector = calcVectorMult(orthoVector, sineVal);
    this.segments[0] = calcVectorAdd({x: this.x, y: this.y}, orthoVector);

    for (let i = 1; i < this.segmentSize.length; i++) {
      var diff = calcVectorSubtract(this.segments[i - 1], this.segments[i]);
      let ortho = calcOrthogonalVector(diff);
      let waveOffset = Math.sin(Date.now()/this.oscillationPeriod + i * bodyPhaseOffset + this.phase) * bodyOscillationAmplitude;
      //console.log(waveOffset, diff);
      diff = calcVectorAdd(diff, calcVectorMult(ortho, waveOffset));
      diff = calcVectorMult(calcVectorNorm(diff), this.size);
      this.segments[i] = calcVectorSubtract(this.segments[i - 1], diff);
    }
  }
};

Predator.prototype = new Boid();
Predator.prototype.constructor = Predator;
Predator.constructor = Boid.prototype.constructor;

const PREDATOR_NUM_SEGMENTS = 10;
const SHARK_SEGMENT_SIZE = [.1, .35, .55, .68, .85, .92, 1, .92, .85, .8, .75, .64, .53, .5, .4, .33, .25, .2, .1, .05];
const SEGMENT_LENGTH = 3;

function Predator(x, y) {
  this.init(x, y);

  this.type = "predator";

  // body
  this.maturity = 6;
  this.speed = 2;
  this.size = 5;
  this.hungerLimit = 25000;
  this.color = 'rgb(' + ~~random(100,250) + ',' + ~~random(10,30) + ',' + ~~random(10,30) + ')';

  // brains
  this.eyesight = 200;
  this.flockDistance = 2000;
  this.matchVelFactor = 2000; //factor that determines how much the flock velocity affects the boid. less = more matching
  this.separationScale = 1;
  this.personalSpace = 70;
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
  ctx.beginPath();
  ctx.moveTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
  ctx.lineTo( this.x + ( this.unitV.y * drawSize ), this.y - ( this.unitV.x * drawSize ));
  ctx.lineTo( this.x - ( this.unitV.x * drawSize * 3 ), this.y - ( this.unitV.y * drawSize * 3 ));
  ctx.lineTo( this.x - ( this.unitV.y * drawSize ), this.y + ( this.unitV.x * drawSize ));
  ctx.lineTo( this.x + ( this.unitV.x * drawSize ), this.y + ( this.unitV.y * drawSize ));
  ctx.fillStyle = this.color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = this.color;
  ctx.fill();

  for (let v of this.segments) {
    ctx.beginPath();
    ctx.arc( v.x, v.y, 1, 0, TWO_PI );
    ctx.fillStyle = '#000';
    ctx.fill();    
  }
};

/***********************
SIM
***********************/
var boids = [];

var sim = Sketch.create({
  container: document.getElementById( 'container' )
});

sim.setup = function() {
  for ( i = 0; i < 80; i++ ) {
    x = random(0, sim.width);
    y = random(0, sim.height);
    sim.spawn(x, y);
  }
  // Spawn at least a single predator;
  sim.spawn(random(0, sim.width), random(0, sim.height), 'predator');
};

sim.spawn = function(x, y, type = undefined) {
  var predatorProbability = 0.01;
      
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
  sim.fillText('fps: ' + fps.toFixed(2), sim.width - 50, sim.height - 10);
  c++;
};