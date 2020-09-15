'use strict';

const config = require('../config.json');
const MySQLConnector = require('../services/mysql.js');
const db = new MySQLConnector(config.db);

const GeofenceType = {
    Circle: 'circle',
    Geofence: 'geofence'
};

class Geofence {
    
    constructor(name, type, data) {
        this.name = name;
        this.type = type;
        this.data = data;
    }

    /**
     * Load all geofences/circle routes.
     */
    static async getAll() {
        let sql = `
        SELECT name, type, data
        FROM geofence
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(err => {
                console.error('[Geofence] Error:', err);
                return null;
            });
        let geofences = [];
        if (results) {
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                geofences.push(new Geofence(
                    result.name,
                    result.type,
                    JSON.parse(result.data)
                ));
            }
        }
        return geofences;
    }
    
    /**
     * Get geofence by name.
     */
    static async getByName(name) {
        let sql = `
        SELECT name, type, data
        FROM geofence
        WHERE name = ?
        `;
        let args = [name];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                console.error('[Geofence] Error:', err);
                return null;
            });
        if (results && results.length > 0) {
            let result = results[0];
            return new Geofence(
                result.name,
                result.type,
                JSON.parse(result.data)
            );
        }
        return null;
    }

    static async deleteByName(name) {
        let sql = `
        DELETE FROM geofence
        WHERE name = ?
        `;
        let args = [name];
        try {
            let results = await db.query(sql, args);
            console.log('[Geofence] DeleteByName:', results);
        } catch (err) {
            console.error('[Geofence] Error:', err);
        }
    }

    async create() {
        let sql = `
        INSERT INTO geofence (name, type, data) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            type=VALUES(type),
            data=VALUES(data)
        `;
        let args = [this.name, this.type, JSON.stringify(this.data || {})];
        try {
            let results = await db.query(sql, args);
            console.log('[Geofence] Save:', results);
        } catch (err) {
            console.error('[Geofence] Error:', err);
        }
    }

    async save(oldName) {
        let sql = `
        UPDATE geofence SET name = ?, type = ?, data = ?
        WHERE name = ?
        `;
        let args = [this.name, this.type, JSON.stringify(this.data || {}), oldName];
        try {
            let results = await db.query(sql, args);
            console.log('[Geofence] Save:', results);
        } catch (err) {
            console.error('[Geofence] Error:', err);
        }
    }

    static areaToGeofences(area) {
        let coordArray = [];
        let areaRows = area.split('\n');
        let currentIndex = 0;
        for (let i = 0; i < areaRows.length; i++) {
            const areaRow = areaRows[i];
            let rowSplit = areaRow.split(',');
            if (rowSplit.length === 2) {
                let lat = parseFloat(rowSplit[0].trim());
                let lon = parseFloat(rowSplit[1].trim());
                if (lat && lon) {
                    while (coordArray.length !== currentIndex + 1) {
                        coordArray.push([]);
                    }
                    coordArray[currentIndex].push({
                        lat: lat,
                        lon: lon
                    });
                }
            } else if (areaRow.includes('[') && areaRow.includes(']') &&
                       coordArray.length > currentIndex && coordArray[currentIndex].length !== 0) {
                currentIndex++;
            }
        }
        return coordArray;        
    }
    
    static areaToCirclePoints(area) {
        let coords = [];
        let areaRows = area.split('\n');
        for (let i = 0; i < areaRows.length; i++) {
            const areaRow = areaRows[i];
            let rowSplit = areaRow.split(',');
            if (rowSplit.length === 2) {
                let lat = parseFloat(rowSplit[0].trim());
                let lon = parseFloat(rowSplit[1].trim());
                if (lat && lon) {
                    coords.push({ lat: lat, lon: lon });
                }
            }
        }
        return coords;        
    }

    static fromString(type) {
        switch (type) {
            case 'circle':
                return 'Circle';
            case 'geofence':
                return 'Geofence';
        }
        return null;
    }
}

module.exports = { GeofenceType, Geofence };