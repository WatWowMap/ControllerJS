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
    constructor(name, type, data, geofence, count = 0) {
        this.name = name;
        this.type = type;
        this.data = data;
        this.geofence = geofence;
        this.count = count;
    }

    /**
     * Load all instances.
     */
    static async getAll() {
        let sql = `
        SELECT name, type, data, geofence, count
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
                    result.geofence,
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
        SELECT name, type, data, geofence
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
                JSON.parse(result.data),
                result.geofence
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
        INSERT INTO instance (name, type, data, geofence) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            type=VALUES(type),
            data=VALUES(data),
            geofence=VALUES(geofence)
        `;
        let args = [this.name, this.type, JSON.stringify(this.data || {}), this.geofence];
        try {
            let results = await db.query(sql, args);
            //console.log('[Instance] Save:', results);
        } catch (err) {
            console.error('[Instance] Error:', err);
        }
    }

    static fromString(type) {
        switch (type) {
            case 'circle_pokemon':
            case 'circlepokemon':
                return 'Circle Pokemon';
            case 'circle_raid':
            case 'circleraid':
                return 'Circle Raid';
            case 'circle_smart_raid':
                return 'Smart Circle Raid';
            case 'auto_quest':
            case 'autoquest':
                return 'Auto Quest';
            case 'pokemon_iv':
            case 'pokemoniv':
                return 'Pokemon IV';
        }
        return null;
    }

    /*
    static async getDeviceUUIDsIn(name) {
        const sql = 'SELECT uuid FROM device WHERE instance_name = ?';
        const args = [name];
        const results = await db.query(sql, args);
        return results;
    }

    static async instanceOnComplete(name) {
        console.log('[Instance] Calling on complete assignments.');
        const assignments = await Assignment.getAll();
        const devices = await this.getDeviceUUIDsIn(name);
        const deviceUUIDs = devices.map(x => x.uuid);
        for (let i = 0; i < assignments.length; i++) {
            let assignment = assignments[i];
            if (assignment.enabled && assignment.time !== 0 && deviceUUIDs.includes(assignment.deviceUUID)) {
                console.warn('[Instance] Triggering assignment');
                this.triggerAssignment(assignment);
                return;
            }
        }
    }

    static async triggerAssignment(assignment, force = false) {
        if (!(force || (assignment.enabled && (!assignment.date || new Date(assignment.date) === new Date())))) {
            return;
        }
        let device;
        try {
            device = await Device.getById(assignment.deviceUUID);
        } catch (err) {
            console.error('[AssignmentController] Error:', err);
        }
        if (device && device.instanceName !== assignment.instanceName) {
            console.log(`[AssignmentController] Assigning device ${device.uuid} to ${assignment.instanceName}`);
            //await InstanceController.instance.removeDevice(device);
            device.instanceName = assignment.instanceName;
            try {
                await device.save(device.uuid);
            } catch (err) {
                console.error('[AssignmentController] Failed to update device', device.uuid, 'assignment with instance name:', assignment.instanceName);
            }
            //InstanceController.instance.addDevice(device);
        }
    }
    */
}

module.exports = Instance;