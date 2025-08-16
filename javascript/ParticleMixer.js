class ParticleMixer {
    constructor() {
        this.isMixing = false;
        this.lastMousePos = null;
        this.mixRadius = 60;
        this.forceMultiplier = 10;
    }

    startMix(mousePos) {
        this.isMixing = true;
        this.lastMousePos = mousePos.Cpy();
    }

    updateMix(mousePos, particles) {
        if (!this.isMixing || !this.lastMousePos) return;

        // Calculate mouse movement
        let mouseDelta = Sub(mousePos, this.lastMousePos);
        let mouseSpeed = mouseDelta.Length();
        
        // Apply force to particles within mix radius
        for (let i = 0; i < particles.length; i++) {
            let particle = particles[i];
            let distance = Sub(particle.position, mousePos).Length();
            
            if (distance < this.mixRadius) {
                // Calculate force based on mouse movement
                let forceDirection = mouseDelta.Cpy();
                if (mouseSpeed > 0) {
                    forceDirection.Normalize();
                    
                    // Force strength based on mouse speed and distance
                    let distanceFactor = 1 - (distance / this.mixRadius); // Closer = stronger
                    let speedFactor = Math.min(mouseSpeed / 5, 4); // More responsive to speed
                    let forceStrength = this.forceMultiplier * distanceFactor * speedFactor;
                    
                    // Apply force to particle velocity
                    let force = Scale(forceDirection, forceStrength);
                    particle.velocity = Add(particle.velocity, force);
                    
                    // Limit velocity to prevent excessive movement
                    let velocityLength = particle.velocity.Length();
                    if (velocityLength > 20) {
                        particle.velocity.Normalize();
                        particle.velocity = Scale(particle.velocity, 20);
                    }
                }
            }
        }
        
        this.lastMousePos = mousePos.Cpy();
    }

    endMix() {
        this.isMixing = false;
        this.lastMousePos = null;
    }

    drawMixRadius(mousePos) {
        if (this.isMixing) {
            DrawUtils.drawCircle(mousePos, this.mixRadius, "#ff6b35", 1);
        }
    }

    setMixRadius(radius) {
        this.mixRadius = Math.max(20, Math.min(100, radius));
    }

    setForceMultiplier(multiplier) {
        this.forceMultiplier = Math.max(0.1, Math.min(2.0, multiplier));
    }
} 