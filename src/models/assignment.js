'use strict';

const config = require('../config.json');
const MySQLConnector = require('../services/mysql.js');
const db = new MySQLConnector(config.db);

/**
 * Assignment model class.
 */
class Assignment {

    /**
     * Initalize new Assignment object.
     */
    constructor(instanceName, deviceUUID, time = 0, enabled = true) {
        this.instanceName = instanceName;
        this.deviceUUID = deviceUUID;
        this.time = time;
        this.enabled = enabled;
    }

    static async getAll() {
        let sql = `
        SELECT device_uuid, instance_name, time, enabled
        FROM assignment
        `;
        let results = await db.query(sql);
        let assignments = [];
        if (results && results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                assignments.push(new Assignment(
                    result.instance_name,
                    result.device_uuid,
                    result.time,
                    result.enabled)
                );
            }
        }
        return assignments;
    }

    static async getByUUID(instanceName, deviceUUID, time) {
        let sql = `
        SELECT device_uuid, instance_name, time, enabled
        FROM assignment
        WHERE instance_name = ? AND device_uuid = ? AND time = ?
        `;
        let args = [instanceName, deviceUUID, time];
        let results = await db.query(sql, args);
        if (results && results.length > 0) {
            let result = results[0];
            return new Assignment(result.instance_name, result.device_uuid, result.time, result.enabled);
        }
        return null;
    }
}

module.exports = Assignment;