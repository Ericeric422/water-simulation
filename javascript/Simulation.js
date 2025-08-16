class Simulation{
    constructor(){
        this.particles = [];
        this.springs = new Map();

        this.AMOUNT_PARTICLES = 1000;
        this.VELOCITY_DAMPENING = 0.99;
        this.GRAVITY = new Vector2(0, 1);
        this.REST_DENSITY = 10;
        this.K_NEAR = 3;
        this.K = 0.5;
        this.INTERACTION_RADIUS = 25;
        
        // Particle spawning constants
        this.PARTICLES_PER_FRAME = 1;  // Number of particles to spawn per frame
        this.SPAWN_SPREAD = 10;        // Random spread radius for particle spawning

        this.SIGMA = 0;
        this.BETA = 0;

        this.GAMMA = 0.1;
        this.PLASTICITY = 0.9;
        this.SPRING_STIFFNESS = 1;

        this.fluidHashGrid = new FluidHashGrid(this.INTERACTION_RADIUS);
        this.fluidHashGrid.initialize(this.particles);

        //this.instantiateParticles();
    }

    instantiateParticles(){
        let offsetBetweenParticles = 10;
        let offsetAllParticles = new Vector2(750,100);

        let xParticles = Math.sqrt(this.AMOUNT_PARTICLES);
        let yParticles = xParticles;

        for(let x=0; x < xParticles; x++){
            for(let y=0; y < yParticles; y++){
                let position = new Vector2(
                    x*offsetBetweenParticles + offsetAllParticles.x,
                    y*offsetBetweenParticles + offsetAllParticles.y
                );
                let particle = new Particle(position);
                this.particles.push(particle);
            }
        }
    }

    neighborSearch(){
        this.fluidHashGrid.clearGrid();
        this.fluidHashGrid.mapParticleToCell();
    }

    update(dt, mouseDown = false, mousePos = null, wallManager = null){
        this.neighborSearch();

        // Spawn particles at mouse position if mouse is held
        if(mouseDown && mousePos){
            // Spawn multiple particles with zero velocity
            for(let i = 0; i < this.PARTICLES_PER_FRAME; i++){
                // Add some random offset to spread particles slightly
                let offset = new Vector2(
                    (Math.random() - 0.5) * this.SPAWN_SPREAD, // Random X offset
                    (Math.random() - 0.5) * this.SPAWN_SPREAD  // Random Y offset
                );
                let spawnPos = Add(mousePos, offset);
                let particle = new Particle(spawnPos);
                particle.velocity = new Vector2(0, 0); // Zero initial velocity
                this.particles.push(particle);
            }
        }

        this.applyGravity(dt);

        this.viscosity(dt);

        this.predictPositions(dt);

        //this.adjustSprings(dt);
        //this.springDisplacement(dt);

        this.doubleDensityRelaxation(dt);

        // Wall collision
        if (wallManager) {
            for (let i = 0; i < this.particles.length; i++) {
                wallManager.handleCollisions(this.particles[i]);
            }
        }

        this.worldBoundary();
        this.computeNextVelocity(dt);
    }

    adjustSprings(dt){
        for(let i=0; i < this.particles.length; i++){
            let neighbors = this.fluidHashGrid.getNeighbourOfParticleIdx(i);
            let particleA = this.particles[i];
            for(let j=0; j < neighbors.length; j++){
                let particleB = this.particles[neighbors[j]];
                if(particleA == particleB) continue;

                let springId = i + neighbors[j] * this.particles.length;

                if (this.springs.has(springId)){
                    continue;
                }

                let rij = Sub(particleB.position, particleA.position);
                let q = rij.Length() / this.INTERACTION_RADIUS;

                if (q < 1){
                    let newSpring = new Spring(i, neighbors[j], this.INTERACTION_RADIUS);
                    this.springs.set(springId, newSpring);
                }

            }
        }


        for(let [key, spring] of this.springs){
            let pi = this.particles[spring.particleAIdx];
            let pj = this.particles[spring.particleBIdx];

            let rij = Sub(pi.position, pj.position).Length();
            let Lij = spring.length;
            let d = this.GAMMA * spring.length;

            if (rij > Lij + d){
                spring.length += dt * this.PLASTICITY * (rij - Lij - d); //stretching
            }else if(rij < Lij - d){
                spring.length -= dt * this.PLASTICITY * (Lij - d - rij); //compression
            }

            if(spring.length > this.INTERACTION_RADIUS){
                this.springs.delete(key);
            }
        }
    }

    springDisplacement(dt){
        let dtSquared = dt * dt;
        for(let [key, spring] of this.springs){
            let pi = this.particles[spring.particleAIdx];
            let pj = this.particles[spring.particleBIdx];

            let rij = Sub(pi.position, pj.position);
            let distance = rij.Length();
            if (distance < 0.0001){
                continue;
            }

            rij.Normalize();

            let displacementTerm = dtSquared * this.SPRING_STIFFNESS *
                (1 - spring.length / this.INTERACTION_RADIUS) * (spring.length - distance);
            
            rij = Scale(rij, displacementTerm * 0.5);

            pi.position = Add(pi.position, rij);
            pj.position = Sub(pj.position, rij);
        }
    }


    viscosity(dt){
        for(let i=0; i < this.particles.length; i++){
            let neighbors = this.fluidHashGrid.getNeighbourOfParticleIdx(i);
            let particleA = this.particles[i];

            for(let j=0; j < neighbors.length; j++){
                let particleB = this.particles[neighbors[j]];
                if(particleA == particleB) continue;

                let rij = Sub(particleB.position, particleA.position);
                let velocityA = particleA.velocity;
                let velocityB = particleB.velocity;
                let q = rij.Length() / this.INTERACTION_RADIUS;

                if(q < 1.0){
                    rij.Normalize();
                    let u = Sub(velocityA, velocityB).Dot(rij);
                    if(u > 0){
                        let ITerm = dt * (1 - q) * (this.SIGMA * u + this.BETA * u * u);
                        let I = Scale(rij, ITerm);

                        particleA.velocity = Sub(particleA.velocity, Scale(I, 0.5));
                        particleB.velocity = Add(particleB.velocity, Scale(I, 0.5));
                    }
                }
            }
        }

    }

    doubleDensityRelaxation(dt){
        for(let i=0; i < this.particles.length; i++){
            let density = 0;
            let densityNear = 0;
            let neighbors = this.fluidHashGrid.getNeighbourOfParticleIdx(i);
            let particleA = this.particles[i];
            for(let j=0; j < neighbors.length; j++){
                let particleB = this.particles[neighbors[j]];
                if(particleA == particleB) continue;

                let rij = Sub(particleB.position, particleA.position);
                let q = rij.Length() / this.INTERACTION_RADIUS;

                if(q < 1.0){
                    density += Math.pow(1 - q, 2);
                    densityNear += Math.pow(1 - q, 3);
                }
            }

            let pressure = this.K * (density - this.REST_DENSITY);
            let pressureNear = this.K_NEAR * densityNear;
            let particleADisplacement = Vector2.Zero();

             for(let j=0; j < neighbors.length; j++){
                let particleB = this.particles[neighbors[j]];
                if(particleA == particleB) continue;

                let rij = Sub(particleB.position, particleA.position);
                let q = rij.Length() / this.INTERACTION_RADIUS;

                if(q < 1.0){
                    rij.Normalize();
                    let displacementTerm = Math.pow(dt, 2) * 
                        (pressure * (1 - q) + pressureNear * Math.pow(1 - q, 2));
                    let D = Scale(rij, displacementTerm);

                    particleB.position = Add(particleB.position, Scale(D, 0.5));
                    particleADisplacement = Sub(particleADisplacement, Scale(D, 0.5));
                }
            }
            particleA.position = Add(particleA.position, particleADisplacement);
        }
    }

    applyGravity(dt){
        for(let i=0; i < this.particles.length; i++){
            this.particles[i].velocity = Add(this.particles[i].velocity, Scale(this.GRAVITY, dt));
        }
    }


    predictPositions(dt){
        for(let i=0; i < this.particles.length; i++){
            this.particles[i].prevPosition = this.particles[i].position.Cpy();
            let positionDelta = Scale(this.particles[i].velocity, dt * this.VELOCITY_DAMPENING);
            this.particles[i].position = Add(this.particles[i].position, positionDelta);
        }
    }

    computeNextVelocity(dt){
        for(let i=0; i < this.particles.length; i++){
            let velocity = Scale(Sub(this.particles[i].position, this.particles[i].prevPosition), 1.0 / dt);
            this.particles[i].velocity = velocity;
        }
    }

    worldBoundary(){
        for(let i=0; i < this.particles.length; i++){
            let pos = this.particles[i].position;

            if(pos.x < 0){
                this.particles[i].position.x = 0;
                this.particles[i].prevPosition.x = 0;
            }
            if(pos.y < 0){
                this.particles[i].position.y = 0;
                this.particles[i].prevPosition.y = 0;
            }
            if(pos.x > canvas.width){
                this.particles[i].position.x = canvas.width - 1;
                this.particles[i].prevPosition.x = canvas.width - 1;
            }
            
            if(pos.y > canvas.height){
                this.particles[i].position.y = canvas.height - 1;
                this.particles[i].prevPosition.y = canvas.height - 1;
            }

            
        }
    }



    draw(){
        for (let i = 0; i < this.particles.length; i++) {
            DrawUtils.drawPoint(this.particles[i].position, 5, this.particles[i].color);
        }
    }
}