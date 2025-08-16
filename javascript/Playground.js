class Playground{
    constructor(){
        this.simulation = new Simulation();
        this.mousePos = Vector2.Zero();
        this.mouseDown = false;
        this.wallManager = new WallManager(); // Add this line
        this.drawingWall = false;
        this.actionMode = 'water'; // Default to water mode
        this.particleMixer = new ParticleMixer();
    }

    update(dt){
        this.simulation.update(0.25, this.mouseDown, this.mousePos, this.wallManager);
    }
    draw(){
        this.simulation.draw();
        this.wallManager.draw(); // Draw walls
        this.particleMixer.drawMixRadius(this.mousePos); // Draw mix radius
    }

    onMouseMove(position){
        this.mousePos = position;
        if (this.drawingWall && this.actionMode === 'wall') {
            this.wallManager.onMouseMove(position);
        } else if (this.actionMode === 'mix' && this.particleMixer.isMixing) {
            this.particleMixer.updateMix(position, this.simulation.particles);
        }
    }

    setActionMode(mode) {
        this.actionMode = mode;
    }

    onMouseDown(button){
        if (button === 0) { // Left mouse button
            if (this.actionMode === 'water') {
                this.mouseDown = true;
            } else if (this.actionMode === 'wall') {
                this.drawingWall = true;
                this.wallManager.onMouseDown(this.mousePos);
            } else if (this.actionMode === 'mix') {
                this.particleMixer.startMix(this.mousePos);
            }
        }
    }

    onMouseUp(button){
        if (button === 0) { // Left mouse button
            if (this.actionMode === 'water') {
                this.mouseDown = false;
            } else if (this.actionMode === 'wall' && this.drawingWall) {
                this.wallManager.onMouseUp(this.mousePos);
                this.drawingWall = false;
            } else if (this.actionMode === 'mix') {
                this.particleMixer.endMix();
            }
        }
    }

    reset(){
        // Clear all particles and walls
        this.simulation.particles = [];
        this.simulation.fluidHashGrid.clearGrid(); // Clear the hash grid
        this.simulation.fluidHashGrid.initialize(this.simulation.particles); // Reinitialize with empty array
        this.wallManager.walls = [];
        this.drawingWall = false;
        this.mouseDown = false;
    }
}