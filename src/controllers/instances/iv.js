'use strict';

const Pokemon = require('../../models/pokemon.js');
const GeofenceService = require('../../services/geofence.js');

/**
 * IV instance controller class
 */
class IVInstanceController {

    /**
     * Instantiate a new IVInstanceController object
     * @param {*} name IV instance name
     * @param {*} polygon Polygon the IV instance should respect
     * @param {*} pokemonList Valid pokemon list found within IV instance
     * @param {*} minLevel Minimum IV account level required
     * @param {*} maxLevel Maximum IV account level required
     * @param {*} ivQueueLimit Maximum limited in IV queue
     */
    constructor(name, polygon, pokemonList, minLevel, maxLevel, ivQueueLimit) {
        this.name = name;
        this.polygon = polygon;
        this.pokemonList = pokemonList;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.ivQueueLimit = ivQueueLimit || 100;
        this.shouldExit = false;
        this.count = 0;
        this.pokemonQueue = [];
        this.pendingPokemon = {};
        this.startDate = null;
    }

    getTask(uuid, username, startup) {
        if (this.pokemonQueue.length === 0) {
            return null;
        }
        let pokemon = this.pokemonQueue.shift();
        if (new Date().getSeconds() - (pokemon.firstSeenTimestamp || 1) >= 600) {
            return this.getTask(uuid, username, false);
        }
        this.pendingPokemon[pokemon.id] = setTimeout(() => {
            if (this.shouldExit) {
                return;
            }
            (async () => {
                let pokemonReal;
                try {
                    pokemonReal = await Pokemon.getById(pokemon.id);
                } catch (err) {
                    console.error('[IVController] Error:', err);
                } finally {
                    delete this.pendingPokemon[pokemon.id];
                }
                if (this.shouldExit || !pokemonReal) {
                    return;
                }
                if (!pokemonReal.atkIv) {
                    console.debug(`[IVController] Checked Pokemon ${pokemonReal.id} does not have IV`);
                    this.addPokemon(pokemonReal);
                } else {
                    console.debug(`[IVController] Checked Pokemon ${pokemonReal.id} has IV`);
                    this.gotIV(pokemonReal);
                }
            })();
        }, 120 * 1000);
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
            ivh = (this.count / (new Date() - this.startDate)) * 3600;
            ivh = ivh * 1000;
        }
        let ivhString;
        if (!ivh) {
            ivhString = '-';
        } else {
            ivhString = Math.round(ivh);
        }
        return `<a href="/instance/ivqueue/${encodeURIComponent(this.name)}">Queue</a>: ${this.pokemonQueue.length}, IV/h: ${ivhString}`;
    }

    reload() {
    }

    stop() {
        this.shouldExit = true;
    }

    getQueue() {
        let pokemon = this.pokemonQueue;
        return pokemon;
    }

    addPokemon(pokemon) {
        if (!this.pokemonList.includes(pokemon.pokemonId)) {
            // Pokemon id not in pokemon IV list
            return;
        }
        if (this.pendingPokemon[pokemon.id] !== undefined || this.pokemonQueue.includes(pokemon)) {
            // Queue already contains pokemon
            return;
        }
        // Check if Pokemon is within any of the instances area geofences
        if (!GeofenceService.inMultiPolygon(this.polygon, pokemon.lat, pokemon.lon)) {
            return;
        }

        let index = this.lastIndexOf(pokemon.pokemonId);
        if (this.pokemonQueue.length >= this.ivQueueLimit && index === null) {
            console.debug('[IVController] Queue is full!');
        } else if (this.pokemonQueue.length >= this.ivQueueLimit) {
            this.pokemonQueue.splice(index, 0, pokemon);
            // Remove last pokemon.
            this.pokemonQueue.pop();
        } else if (index !== null) {
            this.pokemonQueue.splice(index, 0, pokemon);
        } else {
            this.pokemonQueue.push(pokemon);
        }
    }

    gotIV(pokemon) {
        if (!GeofenceService.inMultiPolygon(this.polygon, pokemon.lat, pokemon.lon)) {
            return;
        }
        let index = this.pokemonQueue.indexOf(pokemon);
        if (index) {
            this.pokemonQueue.splice(index, 1);
        } else {
            const timeout = this.pendingPokemon[pokemon.id];
            if (timeout) {
                clearTimeout(timeout);
                delete this.pendingPokemon[pokemon.id];
            }
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
