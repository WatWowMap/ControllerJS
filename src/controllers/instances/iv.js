'use strict';

const Pokemon = require('../../models/pokemon.js');

class IVInstanceController {
    
    constructor(name, polygon, pokemonList, minLevel, maxLevel, ivQueueLimit) {
        this.name = name;
        this.polygon = polygon;
        this.pokemonList = pokemonList,
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.ivQueueLimit = ivQueueLimit || 100;
        this.shouldExit = false;
        this.count = 0;
        this.pokemonQueue = [];
        this.scannedPokemon = [];
        this.startDate = null;

        setInterval(() => this.loop(), 1000);
    }

    async loop() {
        if (this.shouldExit) {
            // TODO: Stop loop?
            return;
        }
        if (this.scannedPokemon.length === 0) {
            // TODO: Sleep 5 seconds
            if (this.shouldExit) {
                return;
            }
        } else {
            let first = this.scannedPokemon.shift();
            let timeSince = new Date() - first.date;
            if (timeSince < 120) {
                // TODO: Sleep 120 - timeSince
                if (this.shouldExit) {
                    return;
                }
            }
            let success = false;
            let pokemonReal;
            while (!success) {
                try {
                    pokemonReal = await Pokemon.getById(first.pokemon.id);
                } catch (err) {
                    console.error('[IVController] Error:', err);
                    // TODO: Sleep 1 second
                    if (this.shouldExit) {
                        return;
                    }
                }
            }
            if (pokemonReal) {
                if (!pokemonReal.atkIv) {
                    console.debug('[IVController] Checked Pokemon does not have IV');
                    this.addPokemon(pokemonReal);
                } else {
                    console.debug('[IVController] Checked Pokemon has IV');
                }
            }
        }
    }

    getTask(uuid, username, startup) {
        if (this.pokemonQueue.length === 0) {
            return null;
        }
        let pokemon = this.pokemonQueue.shift();
        if (new Date().getSeconds() - (pokemon.firstSeenTimestamp || 1) >= 600) {
            return this.getTask(uuid, username, false);
        }
        this.scannedPokemon.push({ date: new Date(), pokemon: pokemon });
        return {
            'area': this.name,
            'action': 'scan_iv',
            'lat': pokemon.lat,
            'lon': pokemon.lon,
            'is_spawnpoint': pokemon.spawnId !== null,
            'min_level': this.minLevel,
            'max_level': this.maxLevel
        };
    }

    getStatus() {
        let ivh = null;
        if (this.startDate) {
            ivh = this.count / new Date() - this.startDate * 3600;
        }
        let ivhString;
        if (!ivh) {
            ivhString = '-';
        } else {
            ivhString = ivh;
        }
        return `<a href="/instance/ivqueue/${encodeURIComponent(this.name)}">Queue</a>: ${this.pokemonQueue.length}, IV/h: ${ivhString}`;
    }

    reload() {
    }

    stop() {
        this.shouldExit = true;
        // TODO: Kill interval timer
    }

    getQueue() {
        let pokemon = this.pokemonQueue;
        return pokemon;
    }

    addPokemon(pokemon) {
        // TODO: Geofence check
        if (!this.pokemonList.includes(pokemon.pokemonId)) {// && this.polygon.includes({ lat: pokemon.lat, lon: pokemon.lon })) {
            // Pokemon id not in pokemon IV list
            return;
        }
        if (this.pokemonQueue.includes(pokemon)) {
            // Queue already contains pokemon
            return;
        }
        // TODO: Area check

        let index = this.lastIndexOf(pokemon.pokemonId);
        if (this.pokemonQueue.length >= this.ivQueueLimit && !index) {
            //console.debug('[IVController] Queue is full!');
        } else if (this.pokemonQueue.length >= this.ivQueueLimit) {
            // Insert pokemon at top of queue.
            this.pokemonQueue.unshift(pokemon);
            // Remove last pokemon.
            this.pokemonQueue.pop();
        } else if (index) {
            this.pokemonQueue.splice(index, 0, pokemon);
        } else {
            this.pokemonQueue.push(pokemon);
        }
    }

    gotIV(pokemon) {
        if (this.polygon.includes({ lat: pokemon.lat, lon: pokemon.lon })) {
            let index = this.pokemonQueue.indexOf(pokemon);
            if (index) {
                this.pokemonQueue.remove(index);
            }
            if (!this.startDate) {
                this.startDate = new Date();
            }
            if (this.count === Number.MAX_SAFE_INTEGER) {
                this.count = 0;
                this.startDate = new Date();
            } else {
                this.count++;
            }
        }
    }

    lastIndexOf(pokemonId) {
        let targetPriority = this.pokemonList.indexOf(pokemonId);
        for (let i = 0; i < this.pokemonQueue.length; i++) {
            let pokemon = this.pokemonQueue[i];
            let priority = this.pokemonList.indexOf(pokemon.pokemonId);
            if (targetPriority < priority) {
                return i;
            }
        }
        return null;
    }
}

module.exports = IVInstanceController;