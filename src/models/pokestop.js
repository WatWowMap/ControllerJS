'use strict';

const config = require('../config.json');
const MySQLConnector = require('../services/mysql.js');
const db = new MySQLConnector(config.db);

/**
 * Pokestop model class.
 */
class Pokestop {

    /**
     * Initialize new Pokestop object.
     * @param data 
     */
    constructor(data) {
        this.id = data.id;
        this.lat = data.lat;
        this.lon = data.lon;
        this.name = data.name || null;
        this.url = data.url || null;
        this.enabled = data.enabled || 0;
        this.lureExpireTimestamp = data.lure_expire_timestamp || null;
        this.lastModifiedTimestamp = data.last_modified_timestamp || null;
        this.updated = data.updated || 0;
        
        this.questType = data.quest_type || null;
        this.questTarget = data.quest_target || null;
        this.questTimestamp = data.quest_timestamp || null;
        this.questConditions = data.quest_conditions || null;
        this.questRewards = data.quest_rewards || null;
        this.questTemplate = data.quest_template || null;

        this.cellId = data.cell_id;
        this.lureId = data.lure_id || 0;
        this.pokestopDisplay = data.pokestop_display || null;
        this.incidentExpireTimestamp = data.incident_expire_timestamp || null;
        this.gruntType = data.grunt_type || null;
        this.sponsorId = data.sponsor_id || null;
        this.firstSeenTimestamp = data.first_seen_timestamp || null;
        this.deleted = data.deleted || 0;
    }

    static async getAll(minLat, maxLat, minLon, maxLon, updated = 0) {
        let sql = `
        SELECT id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, updated,
            quest_type, quest_timestamp, quest_target, CAST(quest_conditions AS CHAR) AS quest_conditions,
            CAST(quest_rewards AS CHAR) AS quest_rewards, quest_template, cell_id, lure_id, pokestop_display,
            incident_expire_timestamp, grunt_type, sponsor_id
        FROM pokestop
        WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ? AND deleted = false
        `;
        let args = [minLat, maxLat, minLon, maxLon, updated];
        const results = await db.query(sql, args);
        let pokestops = [];
        if (results && results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                pokestops.push(new Pokestop(result));
            }
        }    
        return pokestops;
    }

    static async getByIds(ids) {
        if (ids.length === 0) {
            return [];
        }
        let inSQL = '(';
        for (let i = 0; i < ids.length; i++) {
            inSQL += '?';
            if (i !== ids.length - 1) {
                inSQL += ',';
            }
        }
        inSQL += ')';
        let sql = `
        SELECT id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, updated,
            quest_type, quest_timestamp, quest_target, CAST(quest_conditions AS CHAR) AS quest_conditions,
            CAST(quest_rewards AS CHAR) AS quest_rewards, quest_template, cell_id, lure_id, pokestop_display,
            incident_expire_timestamp, grunt_type, sponsor_id
        FROM pokestop
        WHERE id IN ${inSQL}
        `;
        let pokestops = [];
        try {
            let results = await db.query(sql, ids);
            if (results && results.length > 0) {
                for (let i = 0; i < results.length; i++) {
                    let result = results[i];
                    pokestops.push(new Pokestop(result));
                }
            }
        } catch (err) {
            console.error('[Pokestop] Error:', err);
        }
        return pokestops;
    }

    async getClosest(lat, lon) {
        let sql = `
        SELECT
            id,
            lat,
            lon,
            ST_DISTANCE_SPHERE(POINT(lon, lat), POINT(?, ?)) AS distance
        FROM pokestop
        WHERE
            quest_type IS NULL AND
            enabled = 1
        ORDER BY
            distance
        `;
        let args = [lon, lat];
        let results = await db.query(sql, args);
        let pokestops = [];
        if (results && results.length) {
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                pokestops.push(new Pokestop(result));
            }
        }
        return pokestops;
    }

    static async clearQuests(ids) {
        let whereSQL = '';
        let args = [];
        if (ids && ids.length > 0) {
            var inSQL = '(';
            for (let i = 0; i < ids.length; i++) {
                inSQL += '?';
                args.push(ids[i]);
                if (i !== ids.length - 1) {
                    inSQL += ',';
                }
            }
            inSQL += ')';
            whereSQL = `WHERE id IN ${inSQL}`;
        }
        let sql = `
            UPDATE pokestop
            SET quest_type = NULL, quest_timestamp = NULL, quest_target = NULL, quest_conditions = NULL, quest_rewards = NULL, quest_template = NULL
            ${whereSQL}
        `;
        let results = await db.query(sql, args);
        console.log('[Pokestop] ClearQuests:', results);
    }

    static async getQuestCountIn(ids) {
        if (ids.length > 10000) {
            let result = 0;
            let count = parseInt(Math.ceil(ids.length / 10000.0));
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, ids.length - 1);
                let slice = ids.slice(start, end);
                let sliceResult = await this.getQuestCountIn(slice);
                if (sliceResult.length > 0) {
                    sliceResult.forEach(x => result += x);
                }
            }
            return result;
        }

        if (ids.length === 0) {
            return 0;
        }

        let inSQL = '(';
        for (let i = 0; i < ids.length; i++) {
            inSQL += '?';
            if (i !== ids.length - 1) {
                inSQL += ',';
            }
        }
        inSQL += ')';

        let sql = `
            SELECT COUNT(*) AS count
            FROM pokestop
            WHERE id IN ${inSQL} AND deleted = false AND quest_reward_type IS NOT NULL
        `;
        let results = await db.query(sql, ids);
        if (results && results.length > 0) {
            const result = results[0];
            return result.count;
        }
        return 0;
    }
}

module.exports = Pokestop;