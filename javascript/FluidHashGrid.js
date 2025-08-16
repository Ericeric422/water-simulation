class FluidHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.hashMap = new Map();
        this.hashMapSize = 10000000;
        this.prime1 = 6614058611;
        this.prime2 = 7528850467;
        this.particles = [];
    }

    initialize(particles) {
        this.particles = particles;
    }

    clearGrid(){
        this.hashMap.clear();
    }


    getGridHashFromPos(pos){
        let x = parseInt(pos.x / this.cellSize);
        let y = parseInt(pos.y / this.cellSize);
        return this.cellIndexToHash(x, y);
    }

    cellIndexToHash(x, y) {
        let hash = (x * this.prime1 ^ y * this.prime2) % this.hashMapSize;
        return hash;
    }

    getNeighbourOfParticleIdx(i){
        let neighbors = []  
        let pos = this.particles[i].position;
        let particleGridX = parseInt(pos.x / this.cellSize);
        let particleGridY = parseInt(pos.y / this.cellSize);
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                let gridX = particleGridX + x;
                let gridY = particleGridY + y;

                let hash = this.cellIndexToHash(gridX, gridY);
                let content = this.getContentOffCell(hash);

                neighbors.push(...content);
            }
        }

        return neighbors;
    }

    mapParticleToCell(){
        for(let i = 0; i < this.particles.length; i++){
            let pos = this.particles[i].position;
            let hash = this.getGridHashFromPos(pos);

            let entries = this.hashMap.get(hash);
            if(entries == null){
                let newArray = [i];
                this.hashMap.set(hash, newArray);
            }else{
                entries.push(i);
            }
        }
    }

    getContentOffCell(id){
        let content = this.hashMap.get(id);
        if (content == null){
            return [];
        }else{
            return content;
        }
    }
}