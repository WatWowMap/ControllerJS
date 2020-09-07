'use strict';

const config = require('../config.json');
const MySQLConnector = require('../services/mysql.js');
const db = new MySQLConnector(config.db);

class Instance {

    /**
     * Initialize new Instance object.
     * @param name Name of the instance.
     * @param type Type of instance.
     * @param data Instance data containing area coordinates, minimum and maximum account level, etc.
     */
    constructor(name, type, data, count = 0) {
        this.name = name;
        this.type = type;
        this.data = data;
        this.count = count;
    }

    /**
     * Load all instances.
     */
    static async getAll() {
        let sql = `
        SELECT name, type, data, count
        FROM instance AS inst
        LEFT JOIN (
            SELECT COUNT(instance_name) AS count, instance_name
            FROM device
            GROUP BY instance_name
        ) devices ON (inst.name = devices.instance_name)
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(err => {
                console.error('[Instance] Error:', err);
                return null;
            });
        let instances = [];
        if (results) {
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                let instance = new Instance(
                    result.name,
                    result.type,
                    JSON.parse(result.data),
                    result.count || 0
                );
                instances.push(instance);
            }
        }
        return instances;
    }

    /**
     * Get instance by name.
     */
    static async getByName(name) {
        let sql = `
        SELECT name, type, data
        FROM instance
        WHERE name = ?
        `;
        let args = [name];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                console.error('[Instance] Error:', err);
                return null;
            });
        if (results && results.length > 0) {
            let result = results[0];
            return new Instance(
                result.name,
                result.type,
                JSON.parse(result.data)
            );
        }
        return null;
    }

    static async deleteByName(name) {
        let sql = `
        DELETE FROM instance
        WHERE name = ?
        `;
        let args = [name];
        try {
            let results = await db.query(sql, args);
            //console.log('[Instance] DeleteByName:', results);
        } catch (err) {
            console.error('[Instance] Error:', err);
        }
    }

    async save() {
        let sql = `
        INSERT INTO instance (name, type, data) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            type=VALUES(type),
            data=VALUES(data)
        `;
        let args = [this.name, this.type, JSON.stringify(this.data || {})];
        try {
            let results = await db.query(sql, args);
            //console.log('[Instance] Save:', results);
        } catch (err) {
            console.error('[Instance] Error:', err);
        }
    }
}

module.exports = Instance;