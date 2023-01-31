var fpsElement = document.getElementById("fps");

canvasId = 'main_canvas'

var then = Date.now() / 1000;
let c = 0;

paper.install(window);
window.onload = function() {
  paper.setup(canvasId);

  pond = new KoiPond()
  view.onFrame = function(event) {
    pond.update(event);
    pond.render();
    
    c++;
    var now = Date.now() / 1000;
    var elapsedTime = now - then;
    then = now;
    if (c % 50 == 0) {
      var fps = 1 / elapsedTime;
      fpsElement.innerText = fps.toFixed(2); 
      c = 0;
    }
  }
} 

var points = 25;

// NUMERICAL CONSTANTS
const numKoi = 20;
const numLeaves = 3;

// COLOR CONSTANTS
const SHADOW_COLOR = 'rgba(0,0,0,0.05)';
const RIPPLE_INV_FREQUENCY = 30;

/*==================
KOI POND
===================*/
class KoiPond {
  constructor() {
    this.koiArr = [];
    this.leavesArr = [];
    this.ripplesArr = [];
    
    for(let i = 0; i < numKoi; i++) {
      this.koiArr.push(new Koi())
    }
    for(let i = 0; i < numLeaves; i++) {
      this.leavesArr.push(new Leaf())
    }
  }

  update(event) {
    // Update ripple sizes.
    if (event.count % Math.floor(Math.random() * RIPPLE_INV_FREQUENCY) == 0) {
      this.ripplesArr.push(new Ripple());
    }
    this.ripplesArr.forEach((r, i) => {
      r.update();
      if (r.lifespan < 0) {
        r.despawn();
        this.ripplesArr.splice(i, 1);
      }
    });
    
    // Update koi.
    this.koiArr.forEach(koi => koi.update(event, this.koiArr));
  }
  
  render() {
    this.koiArr.forEach(koi => koi.render());
    this.ripplesArr.forEach(r => r.render());
    
    // Draw leaves
  }
}

/*==================
KOI
===================*/
const KOI_SHADOW_OFFSET = new Point(8, 30);
const KOI_COLORS = ['#E95D0C', '#EEA237', '#E02D28', '#FFFFFF', '#112540'];
const MAX_KOI_SPEED = .8;
const KOI_MAX_SIZE = 80;
const KOI_MIN_SIZE = 15;
const PERCEPTION_RADIUS = 150;

const MAX_KOI_FORCE = .0001;
const MAX_KOI_TURN_FORCE = .0003;
const ALIGNMENT_COEF = 1;
const COHESION_COEF = 1;
const SEPARATION_COEF = 1.6;

const KOI_SPINE_NUM_SEGMENTS = 20;
const KOI_SPINE_SEGMENT_LENGTH = 6;
const KOI_OSCILLATION_PERIOD = 20;
const KOI_OSCILLATION_AMPLITUDE = 4;

const KOI_WIDTH = 2;
// Koi profile - assuming 20 segments.
const KOI_SEGMENT_SIZE = [.1, .35, .55, .68, .85, .92, 1, .92, .85, .8, .75, .64, .53, .5, .4, .33, .25, .2, .1, .05];


const KOI_MAX_DOTS = 7;
const KOI_PRIMARY_COLOR_PB = .8;
const KOI_SECONDARY_COLOR_PB = .8;

class Koi {
  
  constructor() {
    this.pos = randomPoint(view.viewSize.width, view.viewSize.height);
    this.vel = addPoints(randomPoint(MAX_KOI_SPEED, MAX_KOI_SPEED), 
                         new Point(-.5 * MAX_KOI_SPEED, -.5 * MAX_KOI_SPEED));
    this.acc = new Point(0, 0);
    this.scale = Math.random() * (KOI_MAX_SIZE - KOI_MIN_SIZE) + KOI_MIN_SIZE;
    
    this.path = new Path.Circle({
      center: this.pos,
      radius: this.scale,
      opacity: 0,
    });
    this.color = KOI_COLORS[Math.floor(Math.random() * KOI_COLORS.length)];
    this.path.fillColor = this.color;
    
    // Segments.
    this.segmentLength = KOI_SPINE_SEGMENT_LENGTH * this.scale / KOI_MAX_SIZE;
    this.oscillationPeriod = KOI_OSCILLATION_PERIOD * this.scale / KOI_MAX_SIZE;
    this.oscillationAmplitude = KOI_OSCILLATION_AMPLITUDE * this.scale / KOI_MAX_SIZE;
    this.linePath = new Path();
    let oppositeVel = this.vel.clone().normalize(-1 * this.segmentLength);
    let prev = this.pos;
    for (var i = 0; i < KOI_SPINE_NUM_SEGMENTS; i++) {
      let newPoint = addPoints(prev, oppositeVel);
      this.linePath.add(newPoint);
      prev = newPoint;
    }
    
    this.bodyPath = new Path({
      strokeCap: 'round',
      fillColor: this.color,
    });
    // bodyPath should have 40(39?) points.
    for (var i = 0; i < KOI_SEGMENT_SIZE.length * 2; i++) {
      this.bodyPath.add(this.pos.clone());
    }
    
    this.dots = [];
    // PRIMARY_COLOR
    if (Math.random() < KOI_PRIMARY_COLOR_PB) {
      let primaryColor = KOI_COLORS[Math.floor(Math.random() * KOI_COLORS.length)];
      for (let i = 0; i < Math.floor(Math.random() * KOI_MAX_DOTS); i++) {
        // Add dots -> line segment number, offset, radius, color.
        let segment = Math.floor(Math.random() * 10) + 4; // Front 20% to back 70% -> 4 - 14 for now.
        let dot = {
          segment: segment,
          offset: (2 * KOI_SEGMENT_SIZE[segment] * Math.random()) - KOI_SEGMENT_SIZE[segment],
          radius: 4 + Math.random() * 8,
          color: primaryColor,
          object: null,
        };
        this.dots.push(dot);
      }
    }
    // SECONDARY_COLOR
    if (Math.random() < KOI_SECONDARY_COLOR_PB) {
      let secondaryColor = KOI_COLORS[Math.floor(Math.random() * KOI_COLORS.length)];
      for (let i = 0; i < Math.floor(Math.random() * KOI_MAX_DOTS); i++) {
        // Add dots -> line segment number, offset, radius, color.
        let segment = Math.floor(Math.random() * 10) + 4; // Front 20% to back 70% -> 4 - 14 for now.
        let dot = {
          segment: segment,
          offset: (2 * KOI_SEGMENT_SIZE[segment] * Math.random()) - KOI_SEGMENT_SIZE[segment],
          radius: 4 + Math.random() * 8,
          color: secondaryColor,
          object: null,
        };
        this.dots.push(dot);
      }
    }
    
    this.clipMask = this.bodyPath.clone();
    let group = new Group(this.clipMask, this.bodyPath); //, ...this.dots);
    group.clipped = true;
    
    // Add dots to group.
    this.dots.forEach(dot => {
      let points = Math.floor(Math.random() * 4 + 5);
      let poly = new Path.RegularPolygon(new Point(0, 0), points, dot.radius);
      poly.opacity = 1;
      poly.fillColor = dot.color;
      dot.object = poly;
      group.addChild(poly);
    });
  }
  
  update(event, koiArr) {
    this.acc = addPoints(this.acc, this.calculateFlockForce(koiArr));
    // Acceleration is applied perpendicular to velocity if the force is opposite to the current direction.
    let angle = this.vel.getDirectedAngle(this.acc);
    let appliedForce = this.acc.clone();
    if (Math.abs(angle) > 100) {
      let isNeg = angle < 0;
      appliedForce.x = this.vel.y * (isNeg ? 1 : -1);
      appliedForce.y = this.vel.x * (isNeg ? -1 : 1);
      appliedForce.normalize();
      appliedForce = multiplyPointByScalar(appliedForce,
                                           MAX_KOI_TURN_FORCE * KOI_MAX_SIZE / this.scale);
    }

    this.vel = limitPoint(addPoints(this.vel, appliedForce), MAX_KOI_SPEED, MAX_KOI_SPEED);
    this.pos = addPoints(this.path.position, this.vel);
    keepPointInBounds(this.pos, view.size.height, view.size.width);
    // TODO: Translate all of the segment positions by the same value as the head when moving across boundaries.
    
    // Get vector orthogonal to movement.
    let sineVal = Math.sin(event.count/this.oscillationPeriod) * this.oscillationAmplitude;
    let orthoVector = orthogonalVector(this.vel);
    orthoVector = setMagnitude(orthoVector, sineVal);

    this.linePath.firstSegment.point = addPoints(this.pos, orthoVector);
    for (var i = 0; i < KOI_SPINE_NUM_SEGMENTS - 1; i++) {
      var segment = this.linePath.segments[i];
      var nextSegment = segment.next;
      var vector = subtractPoints(segment.point, nextSegment.point);
      vector.length = this.segmentLength;
      nextSegment.point = subtractPoints(segment.point, vector);
    }
    this.linePath.smooth({ type: 'continuous' });
    
    // Draw body around the perimeter of the profile.
    // TODO: Refactor this more cleanly.
    for (var i = 0; i < KOI_SEGMENT_SIZE.length - 1; i++) {
      var segment = this.linePath.segments[i];
      var nextSegment = segment.next;
      var vector = subtractPoints(segment.point, nextSegment.point);
      let orthoVector = orthogonalVector(vector);
      
      var bodySegment = this.bodyPath.segments[i];
      bodySegment.point = addPoints(segment.point, setMagnitude(orthoVector, KOI_SEGMENT_SIZE[i + 1] * KOI_WIDTH));
      this.clipMask.segments[i].point = bodySegment.point.clone();
    }
    this.bodyPath.segments[KOI_SEGMENT_SIZE.length - 1].point = this.linePath.segments[KOI_SEGMENT_SIZE.length - 1].point.clone();
    this.clipMask.segments[KOI_SEGMENT_SIZE.length - 1].point = this.linePath.segments[KOI_SEGMENT_SIZE.length - 1].point.clone();
    
    for (var i = 0; i < KOI_SEGMENT_SIZE.length - 1; i++) {
      var nextSegment = this.linePath.segments[KOI_SEGMENT_SIZE.length - 1 - i];
      var segment = nextSegment.previous;
      var vector = subtractPoints(segment.point, nextSegment.point);
      let orthoVector = orthogonalVector(vector);
      
      var bodySegment = this.bodyPath.segments[i + KOI_SEGMENT_SIZE.length];
      // bodySegment.point = nextSegment.point.clone();
      bodySegment.point = addPoints(segment.point, setMagnitude(orthoVector, -1 * KOI_SEGMENT_SIZE[KOI_SEGMENT_SIZE.length - i - 1] * KOI_WIDTH));
      this.clipMask.segments[i + KOI_SEGMENT_SIZE.length].point = bodySegment.point.clone();
    }
    this.bodyPath.segments[KOI_SEGMENT_SIZE.length * 2 - 1].point = this.linePath.segments[0].point.clone();
    this.clipMask.segments[KOI_SEGMENT_SIZE.length * 2 - 1].point = this.linePath.segments[0].point.clone();
    
    this.bodyPath.smooth({ type: 'continuous' });
    this.clipMask.smooth({ type: 'continuous' });
    
    // Shadow.
    // TODO: Add this to a separate layer.
    if (this.shadowPath) this.shadowPath.remove();
    this.shadowPath = this.bodyPath.clone();
    this.shadowPath.point = addPoints(this.pos.clone(), KOI_SHADOW_OFFSET);
    this.shadowPath.style = {
      fillColor: SHADOW_COLOR,
      opacity: 1,
    };
    
    // Move dots.
    this.dots.forEach(dot => {
      let vector = subtractPoints(this.linePath.segments[dot.segment].point,
                                  this.bodyPath.segments[dot.segment].point);
      vector = multiplyPointByScalar(vector, dot.offset * KOI_WIDTH);
      dot.object.position = addPoints(this.linePath.segments[dot.segment].point, vector);
    });
  }
  
  applyTurn(acc) {
    let angle = this.vel.getDirectedAngle(acc);
    let appliedForce = acc.clone();
    if (Math.abs(angle) > 100) {
      let isNeg = angle < 0;
      appliedForce.x = this.vel.y * (isNeg ? 1 : -1);
      appliedForce.y = this.vel.x * (isNeg ? -1 : 1);
      appliedForce.normalize();
      appliedForce = multiplyPointByScalar(appliedForce,
                                           MAX_KOI_TURN_FORCE * KOI_MAX_SIZE / this.scale);
    }
    return appliedForce;
  }
  
  render() {
    this.path.position = this.pos;
    this.shadowPath.position = addPoints(this.pos, KOI_SHADOW_OFFSET);
  }
  
  calculateFlockForce(koiArr) {
    let alignment = this.calculateSteeringForce(koiArr, 'align');
    let cohesion = this.calculateSteeringForce(koiArr, 'cohesion');
    let separation = this.calculateSteeringForce(koiArr, 'separation');
    let force = combinePoints([multiplyPointByScalar(this.applyTurn(alignment), ALIGNMENT_COEF),
                               multiplyPointByScalar(this.applyTurn(cohesion), COHESION_COEF),
                               multiplyPointByScalar(separation, SEPARATION_COEF)],
                               addPoints(multiplyPointByScalar(Point.random(), 0.5), new Point(-.25, -.25)));
    // Divide by mass.
    return dividePointByScalar(force, KOI_MAX_SIZE / this.scale);
  }

  calculateSteeringForce (koiArr, factorType) {
    let steering = new Point(0, 0);
    let total = 0;
    for (let koi of koiArr) {
      let d = koi.pos.getDistance(this.pos);
      if (d < PERCEPTION_RADIUS && koi != this) {
        switch (factorType) {
          case 'align':
            steering = addPoints(steering, koi.vel);
            break;
          case 'cohesion':
            steering = addPoints(steering, koi.pos);
            break;
          case 'separation':
            let diff = subtractPoints(this.pos, koi.pos);
            steering = addPoints(steering, dividePointByScalar(diff, d));
            break;
          default:
            break;
        }
        total++
      }
    }

    if (total > 0) {
      steering = dividePointByScalar(steering, total);
      if (factorType === 'cohesion') {
        steering = subtractPoints(steering, this.pos);
      }
      steering = setMagnitude(steering, MAX_KOI_SPEED);
      steering = subtractPoints(steering, this.vel);
      steering = limitPoint(steering, MAX_KOI_FORCE, MAX_KOI_FORCE);      
    }
    
    return steering;
  }
}


/*==================
RIPPLE
===================*/
const RIPPLE_LIFESPAN = 80;
const RIPPLE_FREQ = 60;
const RIPPLE_COLOR = '#FFFFFF';
const RIPPLE_GROWTH = 5;
const RIPPLE_SHADOW_OFFSET = new Point(15, 50);

class Ripple {
  constructor() {
    this.maxLifespan = randomRange(RIPPLE_LIFESPAN, .5, 1.2);
    this.lifespan = this.maxLifespan;
    this.rippleGrowth = randomRange(RIPPLE_GROWTH, .5, 1);
    this.pos = randomPoint(view.viewSize.width, view.viewSize.height);
    this.size = 1;
    this.frameCount = 0;
    
    // Shadow.
    this.shadowPath = new Path.Circle({
      center: addPoints(this.pos.clone(), RIPPLE_SHADOW_OFFSET),
      radius: this.size
    });
    this.shadowPath.style = {
      strokeColor: SHADOW_COLOR,
      strokeWidth: 4,
    };
    
    // Highlight.
    this.path = new Path.Circle({
      center: this.pos,
      radius: this.size
    });
    this.path.style = {
      strokeColor: 'white',
      strokeWidth: 3,
    };
  }
  
  update() {
    this.lifespan--;
    this.frameCount++;
    this.size += (this.rippleGrowth * (1 - .8 * Math.pow(this.frameCount/this.maxLifespan, 2)));
  }
  
  render() {
    setRadius(this.path, this.size);
    setRadius(this.shadowPath, this.size);
    this.path.opacity = 0.5 - (0.5 * (this.frameCount/this.maxLifespan));
    this.shadowPath.opacity = 1 - (this.frameCount/this.maxLifespan);
  }
  
  despawn() {
    this.path.remove();
    this.shadowPath.remove();
  }
}

/*==================
LEAF
===================*/
const MAX_LEAF_SIZE = 100;
const MIN_LEAF_SIZE = 20;
const LEAF_COLOR = '#6da310';

class Leaf {
  
  constructor() {
    this.pos = randomPoint(view.viewSize.width, view.viewSize.height);
    this.scale = Math.random() * (MAX_LEAF_SIZE - MIN_LEAF_SIZE) + MIN_LEAF_SIZE;
    
    // Shadow.
    // makeShadow(path, offset);
    
    this.shadowPath = new Path.Circle({
      center: addPoints(this.pos.clone(), RIPPLE_SHADOW_OFFSET),
      radius: this.scale
    });
    this.shadowPath.style = {
      fillColor: SHADOW_COLOR
    };
    
    // Leaf body.
    this.path = new Path.Circle({
      center: this.pos,
      radius: this.scale
    });
    this.path.fillColor = LEAF_COLOR;
  }
  
  update() {}
  
  render() {
    
  }
}

function randomPoint(xMax, yMax) {
  return new Point(Math.random() * xMax, Math.random() * yMax);
}

function dividePointByScalar(point, scalar) {
  let p = point.clone();
  p.x = p.x / scalar;
  p.y = p.y / scalar;
  return p;
}

function multiplyPointByScalar(point, scalar) {
  let p = point.clone();
  p.x = p.x * scalar;
  p.y = p.y * scalar;
  return p;
}

function addPoints(point1, point2) {
  let p = point1.clone();
  p.x += point2.x;
  p.y += point2.y;
  return p;
}

function subtractPoints(point1, point2) {
  let p = point1.clone();
  p.x -= point2.x;
  p.y -= point2.y;
  return p;
}

function combinePoints(points) {
  let sum = new Point(0, 0);
  for (let p of points) {
    sum.x += p.x;
    sum.y += p.y;
  }
  return sum;
}

function setMagnitude(point, magnitude) {
  let p = point.clone();
  p.normalize();
  p.x *= magnitude;
  p.y *= magnitude;
  return p;
}

function keepPointInBounds(point, height, width, margin = 100) {
  if (point.x > width + margin) {
    point.x = -1 * margin;
  }
  if (point.x < -1 * margin) {
    point.x = width + margin;
  }
  
  if (point.y > height + margin) {
    point.y = -1 * margin;
  } 
  if (point.y < -1 * margin) {
    point.y = height + margin;
  }
}

function limitPoint(point, limitX, limitY) {
  let p = point.clone();
  p.x = Math.min(Math.max(p.x, -1 * limitX), limitX);
  p.y = Math.min(Math.max(p.y, -1 * limitY), limitY);
  return p;
}

function getRadius(path) {
  return path.bounds.width / 2 + path.strokeWidth / 2;
}

function setRadius(path, radius) {
  path.scale(radius / path.bounds.width / 2);
}

function randomRange(value, lowPct, highPct) {
  return Math.random() * value * highPct + value * lowPct;
}

function makeShadow(path, offset, group, color = SHADOW_COLOR) {
  // Shadow.
  let shadowPath = path.clone()
  shadowPath.position = addPoints(path.position, offset);
  shadowPath.strokeColor = SHADOW_COLOR;
  return shadowPath;
}

function orthogonalVector(point) {
  let orthoVector = new Point(point.y, -1 * point.x);
  orthoVector.normalize();
  return orthoVector;
}