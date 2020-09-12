'use strict';

const config = require('../config.json');
const MySQLConnector = require('../services/mysql.js');
const db = new MySQLConnector(config.db);

/**
 * Pokemon model class.
 */
class Pokemon {
    static DittoPokemonId = 132;
    static WeatherBoostMinLevel = 6;
    static WeatherBoostMinIvStat = 4;
    static PokemonTimeUnseen = 1200;
    static PokemonTimeReseen = 600;
    static DittoDisguises = [46,163,165,167,187,223,293,316,322,399,590];
    static DittoMove1Transform = 242;
    static DittoMove2Struggle = 133;

    /**
     * Initialize new Pokemon object.
     * @param data 
     */
    constructor(data) {
        if (data.pokemon_id && data.cell_id) {
            // Initialize Pokemon object from database values
            this.id = data.id;
            this.lat = data.lat;
            this.lon = data.lon;
            this.pokemonId = data.pokemon_id;
            this.form = data.form;
            this.level = data.level;
            this.costume = data.costume;
            this.weather = data.weather;
            this.gender = data.gender;
            this.spawnId = data.spawn_id ? BigInt(data.spawn_id).toString() : null;
            this.cellId = data.cell_id ? BigInt(data.cell_id).toString() : null;
            this.firstSeenTimestamp = data.first_seen_timestamp || new Date().getTime() / 1000;
            this.expireTimestamp = data.expire_timestamp;
            this.expireTimestampVerified = data.expire_timestamp_verified;
            this.cp = data.cp;
            this.move1 = data.move_1;
            this.move2 = data.move_2;
            this.size = data.size;
            this.weight = data.weight;
            this.atkIv = data.atk_iv;
            this.defIv = data.def_iv;
            this.staIv = data.sta_iv;
            this.username = data.username;
            this.shiny = data.shiny;
            this.updated = data.updated;
            this.changed = data.changed;
            this.pokestopId = data.pokestop_id;
            this.displayPokemonId = data.display_pokemon_id;
            this.capture1 = data.capture_1;
            this.capture2 = data.capture_2;
            this.capture3 = data.capture_3;
            this.pvpRankingsGreatLeague = data.pvp_rankings_great_league || null;
            this.pvpRankingsUltraLeague = data.pvp_rankings_ultra_league || null;
        } else {
            // Initialize Pokemon object from redis values
            this.id = data.id;
            this.lat = data.lat;
            this.lon = data.lon;
            this.pokemonId = data.pokemonId;
            this.form = data.form;
            this.level = data.level;
            this.costume = data.costume;
            this.weather = data.weather;
            this.gender = data.gender;
            this.spawnId = data.spawnId ? BigInt(data.spawnId).toString() : null;
            this.cellId = data.cellId ? BigInt(data.cellId).toString() : null;
            this.firstSeenTimestamp = data.firstSeenTimestamp || new Date().getTime() / 1000;
            this.expireTimestamp = data.expireTimestamp;
            this.expireTimestampVerified = data.expireTimestampVerified;
            this.cp = data.cp;
            this.move1 = data.move1;
            this.move2 = data.move2;
            this.size = data.size;
            this.weight = data.weight;
            this.atkIv = data.atkIv;
            this.defIv = data.defIv;
            this.staIv = data.staIv;
            this.username = data.username;
            this.shiny = data.shiny;
            this.updated = data.updated;
            this.changed = data.changed;
            this.pokestopId = data.pokestopId;
            this.displayPokemonId = data.displayPokemonId;
            this.capture1 = data.capture1;
            this.capture2 = data.capture2;
            this.capture3 = data.capture3;
            this.pvpRankingsGreatLeague = data.pvpRankingsGreatLeague || null;
            this.pvpRankingsUltraLeague = data.pvpRankingsUltraLeague || null;
        }
    }

    /**
     * Get pokemon by pokemon encounter id.
     * @param encounterId 
     */
    static async getById(encounterId) {
        let sql = `
            SELECT
                id, pokemon_id, lat, lon, spawn_id, expire_timestamp, atk_iv, def_iv, sta_iv,
                move_1, move_2, gender, form, cp, level, weather, costume, weight, size,
                display_pokemon_id, pokestop_id, updated, first_seen_timestamp, changed, cell_id,
                expire_timestamp_verified, shiny, username, capture_1, capture_2, capture_3,
                pvp_rankings_great_league, pvp_rankings_ultra_league
            FROM pokemon
            WHERE id = ?
            LIMIT 1
        `;
        let args = [encounterId.toString()];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                console.error('[Pokemon] Error:', err);
                return null;
            });
        if (results) {
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                return new Pokemon(result);
            }
        }
        return null;
    }
}

module.exports = Pokemon;
