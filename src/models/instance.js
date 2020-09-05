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
    constructor(name, type, data) {
        this.name = name;
        this.type = type;
        this.data = data;
    }

    /**
     * Load all instances.
     */
    static async getAll() {
        let sql = `
        SELECT name, type, data
        FROM instance
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error('[Instance] Error:', err);
                return null;
            });
        let instances = [];
        if (results) {
            let keys = Object.values(results);
            keys.forEach(key => {
                let data = JSON.parse(key.data);
                let instance = new Instance(
                    key.name,
                    key.type,
                    data
                );
                instances.push(instance);
            });
        }
        return instances;
    }
}

module.exports = Instance;