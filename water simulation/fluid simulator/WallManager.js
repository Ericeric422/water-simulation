class WallManager {
    constructor() {
        this.walls = []; // Each wall is {start: Vector2, end: Vector2}
        this.drawing = false;
        this.currentStart = null;
        this.currentStroke = []; // Array to store points in current stroke
        this.lastMousePos = null;
        this.minDistance = 5; // Minimum distance between points to avoid too many segments
    }

    onMouseDown(pos) {
        this.drawing = true;
        this.currentStart = pos.Cpy();
        this.currentStroke = [pos.Cpy()];
        this.lastMousePos = pos.Cpy();
    }

    onMouseMove(pos) {
        if (this.drawing && this.lastMousePos) {
            // Check if we've moved enough distance to add a new point
            let distance = Sub(pos, this.lastMousePos).Length();
            if (distance > this.minDistance) {
                this.currentStroke.push(pos.Cpy());
                this.lastMousePos = pos.Cpy();
            }
        }
    }

    onMouseUp(pos) {
        if (this.drawing && this.currentStroke.length > 0) {
            // Add final point if it's different from the last one
            let lastPoint = this.currentStroke[this.currentStroke.length - 1];
            if (Sub(pos, lastPoint).Length() > 1) {
                this.currentStroke.push(pos.Cpy());
            }
            
            // Create wall segments from the stroke points
            for (let i = 0; i < this.currentStroke.length - 1; i++) {
                this.walls.push({ 
                    start: this.currentStroke[i], 
                    end: this.currentStroke[i + 1] 
                });
            }
            
            this.currentStart = null;
            this.currentStroke = [];
            this.lastMousePos = null;
            this.drawing = false;
        }
    }

    draw() {
        for (let wall of this.walls) {
            DrawUtils.drawLine(wall.start, wall.end, "#fff", 12);  // Increased from 4 to 12
        }
        // Draw preview while drawing
        if (this.drawing && this.currentStroke.length > 1) {
            // Draw completed segments
            for (let i = 0; i < this.currentStroke.length - 1; i++) {
                DrawUtils.drawLine(this.currentStroke[i], this.currentStroke[i + 1], "#ff0", 8);  // Increased from 2 to 8
            }
        }
    }

    // Simple collision: reflect particle if it crosses a wall segment
    handleCollisions(particle) {
        for (let wall of this.walls) {
            let p = particle.position;
            let prev = particle.prevPosition;
            let a = wall.start, b = wall.end;

            // Line segment collision test
            let ab = Sub(b, a);
            let ap = Sub(p, a);
            let abLen2 = ab.Length2();
            let t = Math.max(0, Math.min(1, ap.Dot(ab) / abLen2));
            let closest = Add(a, Scale(ab, t));
            let dist = Sub(p, closest).Length();

            if (dist < 12) { // Increased from 6 to 12 to match thicker walls
                // Reflect velocity
                let n = Sub(p, closest);
                n.Normalize();
                let vDotN = particle.velocity.Dot(n);
                if (vDotN < 0) {
                    particle.velocity = Sub(particle.velocity, Scale(n, 2 * vDotN));
                    // Push particle out of wall
                    particle.position = Add(closest, Scale(n, 12));
                }
            }
        }
    }
}