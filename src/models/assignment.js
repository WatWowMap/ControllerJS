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

    static async deleteById(deviceUUID, instanceName, time) {
        let sql = `
        DELETE FROM assignment
        WHERE device_uuid = ? AND instance_name = ? AND time = ?
        `;
        let args = [deviceUUID, instanceName, time];
        try {
            let results = await db.query(sql, args);
            //console.log('[Assignment] DeleteById:', results);
        } catch (err) {
            console.error('[Assignment] Error:', err);
        }
    }

    static async deleteAll() {
        let sql = `
        DELETE FROM assignment
        `;
        try {
            let results = await db.query(sql);
            //console.log('[Assignment] DeleteAll:', results);
        } catch (err) {
            console.error('[Assignment] Error:', err);
        }
    }

    async save() {
        let sql = `
        INSERT INTO assignment (device_uuid, instance_name, time, enabled) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            device_uuid=VALUES(device_uuid),
            instance_name=VALUES(instance_name),
            time=VALUES(time),
            enabled=VALUES(enabled)
        `;
        let args = [this.deviceUUID, this.instanceName, this.time, this.enabled];
        try {
            let results = await db.query(sql, args);
            //console.log('[Instance] Save:', results);
        } catch (err) {
            console.error('[Assignment] Error:', err);
        }
    }
}

module.exports = Assignment;