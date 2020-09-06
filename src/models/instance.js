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
                    result.count
                );
                instances.push(instance);
            }
        }
        return instances;
    }
}

module.exports = Instance;