'use strict';

const express = require('express');
const router = express.Router();

const AssignmentController = require('../controllers/assignment-controller.js');
const InstanceController = require('../controllers/instance-controller.js');
const defaultData = require('../data/default.js');
const InstanceType = require('../data/instance-type.js');
const Account = require('../models/account.js');
const Assignment = require('../models/assignment.js');
const Device = require('../models/device.js');
const { Geofence, GeofenceType } = require('../models/geofence.js');
const Instance = require('../models/instance.js');
const Pokestop = require('../models/pokestop.js');
const utils = require('../services/utils.js');

// Main dashboard route
router.get(['/', '/index'], async (req, res) => {
    const data = defaultData;
    data.devices_count = (await Device.getAll()).length;
    data.instances_count = (await Instance.getAll()).length;
    data.assignments_count = (await Assignment.getAll()).length;
    data.accounts_count = await Account.getTotalCount();
    res.render('index', data);
});

// Account routes
router.get('/accounts', async (req, res) => {
    const data = defaultData;
    data.stats = await Account.getStats();
    data.stat_counts = await Account.getStatCounts();
    data.stat_device_counts = await Account.getDeviceAccountStats();
    res.render('accounts', data);
});

router.use('/accounts/add', (req, res) => {
    if (req.method === 'POST') {
        addAccounts(req, res);
    } else {
        const data = defaultData;
        data.level = 0;
        res.render('accounts-add', data);
    }
});


// Assignment routes
router.use('/assignments', (req, res) => {
    res.render('assignments', defaultData);
});

router.use('/assignment/add', async (req, res) => {
    if (req.method === 'POST') {
        // Add new assignment
        await addAssignmentPost(req, res);
    } else {
        const data = defaultData;
        let instances = [];
        let devices = [];
        try {
            devices = await Device.getAll();
            instances = await Instance.getAll();
        } catch (err) {
            console.error('[UI] Failed to get device and instance list:', err);
            res.render('assignment-add', {
                error: 'Internal Server Error!',
                show_error: true
            });
            return;
        }
        let instancesData = [];
        if (instances) {
            instances.forEach(instance => {
                instancesData.push({
                    name: instance.name, 
                    selected: false,
                    selected_source: false
                });
            });
        }
        data['instances'] = instancesData;
        let devicesData = [];
        if (devices) {
            devices.forEach(device => {
                devicesData.push({
                    uuid: device.uuid,
                    selected: false
                });
            });
        }
        data['devices'] = devicesData;
        data['nothing_selected'] = true;
        data['nothing_selected_source'] = true;
        res.render('assignment-add', data);
    }
});

router.get('/assignment/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await Assignment.deleteById(id);
    } catch (err) {
        console.error('Failed to delete assignment with id:', id);
    }
    res.redirect('/assignments');
});

router.get('/assignment/start/:id', async (req, res) => {
    let id = req.params.id;
    let assignment;
    try {
        assignment = await Assignment.getById(id);
    } catch (err) {
        console.error('Failed to get assignment by id:', id, err);
        res.render('assignment-start', {
            error: 'Failed to find assignment.',
            show_error: true
        });
        return;
    }
    await AssignmentController.instance.triggerAssignment(assignment, true);
    res.redirect('/assignments');
});

router.use('/assignment/edit/:id', async (req, res, next) => {
    if (req.method === 'POST') {
        // Save assignment
        await editAssignmentPost(req, res);
    } else {
        // Get assignment from database
        let id = req.params.id;
        let assignment;
        try {
            assignment = await Assignment.getById(id);
        } catch (err) {
            console.error('Failed to get assignment with id:', id);
        }
        if (!assignment) {
            res.render('assignment-edit', {
                error: 'Assignment does not exist!',
                show_error: true
            });
            return;
        }

        let data = defaultData;
        let instances = [];
        let devices = [];
        try {
            devices = await Device.getAll();
            instances = await Instance.getAll();
        } catch {
            res.render('assignment-edit', {
                error: 'Internal Server Error.',
                show_error: true
            });
            return;
        }

        let instancesData = [];
        instances.forEach(instance => {
            instancesData.push({
                name: instance.name,
                selected: instance.name === assignment.instanceName,
                selected_source: instance.name === assignment.sourceInstanceName
            });
        });
        data['id'] = id;
        data['instances'] = instancesData;
        let devicesData = [];
        devices.forEach(device => {
            devicesData.push({
                uuid: device.uuid,
                selected: device.uuid === assignment.deviceUUID
            });
        });
        data['devices'] = devicesData;

        let formattedTime;
        if (assignment.time === 0) {
            formattedTime = '';
        } else {
            formattedTime = utils.zeroPad(parseInt(assignment.time / 3600), 2) + ':' + utils.zeroPad(parseInt((assignment.time % 3600) / 60), 2) + ':' + utils.zeroPad(parseInt((assignment.time % 3600) % 60), 2)
        }
        data['time'] = formattedTime;
        data['date'] = assignment.date;
        data['enabled'] = assignment.enabled ? 'checked' : '';
        if (!assignment.deviceUUID || !assignment.instanceName) {
            res.render('assignment-edit', {
                error: 'Invalid Request.',
                show_error: true
            });
            return;
        }
        res.render('assignment-edit', data);
    }
});

router.use('/assignment/delete_all', async (req, res) => {
    await Assignment.deleteAll();
    res.redirect('/assignments');
});

// Device routes
router.get('/devices', (req, res) => {
    res.render('devices', defaultData);
});

router.use('/device/assign/:uuid', async (req, res) => {
    const uuid = req.params.uuid;
    const device = await Device.getById(uuid);
    if (!(device instanceof Device)) {
        // Failed to get device by uuid
        res.redirect('/devices');
        return;
    }
    if (req.method === 'POST') {
        // Assign device to instance
        const instance = req.body.instance;
        device.instanceName = instance;
        await device.save(uuid);
        await InstanceController.instance.reloadDevice(device, uuid);
        res.redirect('/devices');
    } else {
        const data = defaultData;
        let instances = await Instance.getAll();
        if (instances) {
            instances.forEach(x => {
                x.selected = x.name === device.instanceName;
            });
        }
        data.instances = instances || [];
        res.render('device-assign', data);
    }
});


// Instance routes
router.get('/instances', (req, res) => {
    res.render('instances', defaultData);
});

router.use('/instance/add', async (req, res) => {
    if (req.method === 'POST') {
        await addInstancePost(req, res);
    } else {
        const data = defaultData;
        data.spin_limit = 3500;
        data.iv_queue_limit = 100;
        data.min_level = 0;
        data.max_level = 29;
        data.nothing_selected = true;
        let geofences = await Geofence.getAll();
        let geofenceData = [];
        for (let i = 0; i < geofences.length; i++) {
            const geofence = geofences[i];
            geofenceData.push({
                'name': geofence.name,
                'type': geofence.type,
                'selected': false
            });
        }
        data['geofences'] = geofenceData;
        res.render('instance-add', data);
    }
});

router.use('/instance/edit/:name', async (req, res) => {
    const name = req.params.name;
    if (req.method === 'POST') {
        if (req.body.delete) {
            await Instance.deleteByName(name);
            res.redirect('/instances');
        } else {
            await addInstancePost(req, res);
        }
    } else {
        // Get instance from database
        const data = defaultData;
        const oldInstance = await Instance.getByName(name);
        if (oldInstance) {
            let oldInstanceData = oldInstance.data;
            data['old_name'] = oldInstance.name;
            data['name'] = oldInstance.name;
            data['geofence'] = oldInstance.geofence;
            data['min_level'] = oldInstanceData['min_level'] || 0;
            data['max_level'] = oldInstanceData['max_level'] || 29;
            data['timezone_offset'] = oldInstanceData['timezone_offset'] || 0;
            data['iv_queue_limit'] = oldInstanceData['iv_queue_limit'] || 100;
            data['spin_limit'] = oldInstanceData['spin_limit'] || 500;
            let geofences = await Geofence.getAll();
            let geofenceData = [];
            for (let i = 0; i < geofences.length; i++) {
                const geofence = geofences[i];
                geofenceData.push({
                    'name': geofence.name,
                    'type': geofence.type,
                    'selected': oldInstance.geofence === geofence.name
                });
            }
            data['geofences'] = geofenceData;
            let pokemonIDs = oldInstanceData['pokemon_ids'];
            if (pokemonIDs) {
                let text = pokemonIDs.join('\n');
                data['pokemon_ids'] = text;
            }
            switch (oldInstance.type) {
                case InstanceType.CirclePokemon:
                    data['circle_pokemon_selected'] = true;
                    break;
                case InstanceType.CircleRaid:
                    data['circle_raid_selected'] = true;
                    break;
                case InstanceType.SmartCircleRaid:
                    data['circle_smart_raid_selected'] = true;
                    break;
                case InstanceType.AutoQuest:
                    data['auto_quest_selected'] = true;
                    break;
                case InstanceType.PokemonIV:
                    data['pokemon_iv_selected'] = true;
                    break;                
            }
        }
        res.render('instance-edit', data);
    }
});

router.get('/instance/ivqueue/:name', (req, res) => {
    const instanceName = req.params.name;
    const data = defaultData;
    data.instance_name = instanceName;
    res.render('instance-ivqueue', data);
});


// Geofence routes
router.get('/geofences', (req, res) => {
    res.render('geofences', defaultData);
});

router.use('/geofence/add', async (req, res) => {
    if (req.method === 'POST') {
        let name = req.body.name;
        let type = req.body.type;
        let area = (req.body.area || '').replace('<br>', '').replace('\r\n', '\n');
        let coordArray = [];
        switch (type) {
            case GeofenceType.Circle:
                coordArray = Geofence.areaToCirclePoints(area);
                break;
            case GeofenceType.Geofence:
                coordArray = Geofence.areaToGeofences(area);
                break;
        }
        if (coordArray.length === 0) {
            res.render('geofence-add', {
                error: 'Failed to parse coords.',
                show_error: true
            });
            return;
        }
        let geofence = new Geofence(name, type, { area: coordArray });
        try {
            await geofence.create();
        } catch (err) {
            res.render('geofence-add', {
                error: 'Failed to create geofence. Does this geofence already exist?',
                show_error: true
            });
            return;
        }
        res.redirect('/geofences');
    } else {
        const data = defaultData;
        data.nothing_selected = true;
        res.render('geofence-add', data);
    }
});

router.use('/geofence/edit/:name', async (req, res) => {
    const oldName = req.params.name;
    if (req.method === 'POST') {
        if (req.body.delete) {
            await Geofence.deleteByName(oldName);
            res.redirect('/geofences');
        } else {
            await editGeofencePost(req, res);
        }
    } else {
        // Load geofence from database
        let oldGeofence;
        try {
            oldGeofence = await Geofence.getByName(oldName);
        } catch (err) {
            res.render('geofence-edit', {
                show_error: true,
                error: 'Internal Server Error'
            });
            return;
        }
        if (!oldGeofence) {
            res.render('geofence-edit', {
                show_error: true,
                error: 'Geofence Not Found'
            });
            return;
        } else {
            let areaString = '';
            let area = oldGeofence.data['area'];
            // Check if geofence or circle
            if (oldGeofence.type === GeofenceType.Circle) {
                for (let i = 0; i < area.length; i++) {
                    const coordLine = area[i];
                    let lat = coordLine['lat'];
                    let lon = coordLine['lon'];
                    areaString += `${lat},${lon}\n`;
                }
            } else if (oldGeofence.type === GeofenceType.Geofence) {
                let index = 1;
                for (let i = 0; i < area.length; i++) {
                    const geofence = area[i];
                    areaString += `[Geofence ${index}]\n`;
                    index++;
                    for (let j = 0; j < geofence.length; j++) {
                        const coordLine = geofence[j];
                        if (!coordLine) {
                            continue;
                        }
                        let lat = coordLine['lat'];
                        let lon = coordLine['lon'];
                        areaString += `${lat},${lon}\n`;
                    }
                }
            } else {
                res.render('geofence-edit', {
                    show_error: true,
                    error: 'Invalid Geofence Type'
                });
                return;
            }
            const data = defaultData;
            data['name'] = oldGeofence.name;
            data['old_name'] = oldGeofence.name;
            data['type'] = oldGeofence.type;
            data['area'] = areaString;
            switch (oldGeofence.type) {
                case GeofenceType.Circle:
                    data['circle_selected'] = true;
                    break;
                case GeofenceType.Geofence:
                    data['geofence_selected'] = true;
                    break;
            }            
            res.render('geofence-edit', data);
        }
    }
});


// Miscellaneous routes
router.use('/settings', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Update settings
    } else {
        // TODO: Provide settings to mustache
        res.render('settings', defaultData);
    }
});

router.use('/clearquests', async (req, res) => {
    if (req.method === 'POST') {
        await Pokestop.clearQuests();
        res.redirect('/');
    } else {
        res.render('clearquests', defaultData);
    }
});


const addAccounts = (req, res) => {
    let level = parseInt(req.body.level || 0);
    let accounts = req.body.accounts;
    if (!accounts) {
        data['show_error'] = true;
        data['error'] = 'Invalid Request.';
        res.redirect('/accounts');
    }
    accounts = accounts.replace('<br>', '')
                       .replace('\r\n', '\n')
                       .replace(';', ',')
                       .replace(':', ',');

    let data = req.body;
    data['accounts'] = accounts;
    data['level'] = level;

    let accs = [];
    let accountRows = accounts.split('\n');
    for (let i = 0; i < accountRows.length; i++) {
        let row = accountRows[i];
        let split = row.split(',');
        if (split.length === 2) {
            let username = split[0].trim();
            let password = split[1].trim();
            accs.push(new Account(username, password, null, null, null, level, null, null, null, 0, 0, null, null, null, null, null, null, null));
        }
    }
    if (accs.length === 0) {
        res.render('accounts-add', {
            error: 'Failed to parse accounts.',
            show_error: true
        });
        return;
    } else {
        try {
            accs.forEach(async acc => await acc.save(false));
        } catch (err) {
            res.render('accounts-add', {
                error: 'Failed to save accounts.',
                show_error: true
            });
            return;
        }
    }
    res.redirect('/accounts');
};

const addInstancePost = async (req, res) => {
    let data = {};
    let instanceName = req.params.name;
    let name = req.body.name;
    let geofence = req.body.geofence;
    let minLevel = parseInt(req.body.min_level || 0);
    let maxLevel = parseInt(req.body.max_level || 29);
    let timezoneOffset = parseInt(req.body.timezone_offset || 0);
    let pokemonIDsText = req.body.pokemon_ids
                                .split('<br>').join(',')
                                .split('\n').join(',');

    let pokemonIDs = [];
    if (pokemonIDsText.trim() === '*') {
        pokemonIDs = Array.from({length: 999}, (v, k) => k + 1);
    } else {
        let pokemonIDsSplit = pokemonIDsText.split(',');
        if (pokemonIDsSplit) {
            pokemonIDs = pokemonIDsSplit.map(x => {
                let pokemonID = parseInt(x.trim());
                if (Number.isInteger(pokemonID)) {
                    return pokemonID;
                }
            });
        }
    }

    let type = req.body.type;
    let ivQueueLimit = parseInt(req.body.iv_queue_limit || 100);
    let spinLimit = parseInt(req.body.spin_limit || 500);

    switch (type) {
        case InstanceType.CirclePokemon:
            data['circle_pokemon_selected'] = true;
            break;
        case InstanceType.CircleRaid:
            data['circle_raid_selected'] = true;
            break;
        case InstanceType.CircleSmartRaid:
            data['circle_smart_raid_selected'] = true;
            break;
        case InstanceType.AutoQuest:
            data['auto_quest_selected'] = true;
            break;
        case InstanceType.PokemonIV:
            data['pokemon_iv_selected'] = true;
            if (pokemonIDs.length === 0) {
                data['show_error'] = true;
                data['error'] = 'Failed to parse Pokemon IDs.';
                return data;
            }
            break;
        default:
            data['nothing_selected'] = true;
            break;
    }

    if (minLevel > maxLevel || minLevel < 0 || minLevel > 40 || maxLevel < 0 || maxLevel > 40) {
        res.render('instance-add', {
            error: 'Invalid Levels',
            show_error: true
        });
        return;
    }

    if (instanceName) {
        // Update existing instance
        let oldInstance;
        try {
            oldInstance = await Instance.getByName(instanceName);
        } catch (err) {
            console.error('[UI] Failed to get existing instance with name:', instanceName);
            res.redirect('/instances');
        }
        if (!oldInstance) {
            res.render('instance-add', {
                error: 'Instance Not Found.',
                show_error: true
            });
            return;
        } else {
            let oldInstanceData = {};
            oldInstance.name = name;
            oldInstance.type = type;
            oldInstance.geofence = geofence;
            oldInstanceData['timezone_offset'] = timezoneOffset;
            oldInstanceData['min_level'] = minLevel;
            oldInstanceData['max_level'] = maxLevel;
            if (type === InstanceType.PokemonIV) {
                oldInstanceData['pokemon_ids'] = pokemonIDs;
                oldInstanceData['iv_queue_limit'] = ivQueueLimit;
            } else if (type === InstanceType.AutoQuest) {
                oldInstanceData['spin_limit'] = spinLimit;
            }
            oldInstance.data = oldInstanceData;
            try {
                await oldInstance.save(instanceName);
            } catch (err) {
                console.error('[UI] Failed to update existing instance:', err);
            }
            await InstanceController.instance.reloadInstance(oldInstance, instanceName);
        }
    } else {
        // Create new instance
        let instanceData = {};
        instanceData['timezone_offset'] = timezoneOffset;
        instanceData['min_level'] = minLevel;
        instanceData['max_level'] = maxLevel;
        if (type === InstanceType.PokemonIV) {
            instanceData['pokemon_ids'] = pokemonIDs;
            instanceData['iv_queue_limit'] = ivQueueLimit;
        } else if (type === InstanceType.AutoQuest) {
            instanceData['spin_limit'] = spinLimit;
        }
        
        try {
            let instance = new Instance(name, type, instanceData, geofence);
            await instance.save();
            InstanceController.instance.addInstance(instance);
        } catch (err) {
            console.error('[UI] Failed to create instance:', err);
        }
    }
    res.redirect('/instances');
};

const addAssignmentPost = async (req, res) => {
    let selectedDevice = req.body.device;
    let selectedInstance = req.body.instance;
    let selectedSourceInstance = req.body.source_instance;
    let time = req.body.time;
    let date = req.body.date;
    let onComplete = req.body.oncomplete;
    let enabled = req.body.enabled;

    let instances = [];
    let devices = [];
    try {
        devices = await Device.getAll();
        instances = await Instance.getAll();
    } catch {
        res.render('assignment-add', {
            error: 'Internal Server Error.',
            show_error: true
        });
        return;
    }

    if (devices.filter(x => x.uuid === selectedDevice) === 0) {
        res.render('assignment-add', {
            error: 'Internal Server Error.', // Device doesn't exist
            show_error: true
        });
    }
    if (instances.filter(x => x.name === selectedInstance) === 0) {
        res.render('assignment-add', {
            error: 'Internal Server Error.', // Instance doesn't exist
            show_error: true
        });
    }

    let timeInt;
    if (!time) {
        timeInt = 0;
    } else {
        let split = time.split(':');
        if (split.length === 3) {
            let hours = parseInt(split[0]);
            let minutes = parseInt(split[1]);
            let seconds = parseInt(split[2]);
            let timeIntNew = hours * 3600 + minutes * 60 + seconds;
            if (timeIntNew === 0) {
                timeInt = 1;
            } else {
                timeInt = timeIntNew;
            }
        } else {
            res.render('assignment-add', {
                error: 'Invalid Time.',
                show_error: true
            });
            return;
        }
    }

    let realDate = null;
    if (date) {
        realDate = new Date(date);
    }

    if (!selectedDevice || !selectedInstance) {
        res.render('assignment-add', {
            error: 'Invalid Request.',
            show_error: true
        });
        return;
    }
    try {
        let assignment = new Assignment(
            null,
            selectedInstance,
            selectedSourceInstance,
            selectedDevice,
            timeInt,
            realDate,
            enabled === 'on'
        );
        assignment.save();
        AssignmentController.instance.addAssignment(assignment);
    } catch {
        res.render('assignment-add', {
            error: 'Failed to assign Device.',
            show_error: true
        });
        return;
    }

    if (onComplete === 'on') {
        try {
            let onCompleteAssignment = new Assignment(
                null,
                selectedInstance,
                selectedSourceInstance,
                selectedDevice,
                0,
                realDate,
                true
            );
            await onCompleteAssignment.save();
            AssignmentController.instance.addAssignment(onCompleteAssignment);
        } catch (err) {
            console.error('[UI] Failed to create new assignment:', err);
        }
    }
    res.redirect('/assignments');
};

const editAssignmentPost = async (req, res) => {
    let selectedDevice = req.body.device;
    let selectedInstance = req.body.instance;
    let selectedSourceInstance = req.body.source_instance;
    let time = req.body.time;
    let date = req.body.date;
    let enabled = req.body.enabled;
    let data = defaultData;
    let timeInt;
    if (!time) {
        timeInt = 0;
    } else {
        let split = time.split(':');
        if (split.length === 3) {
            let hours = parseInt(split[0]);
            let minutes = parseInt(split[1]);
            let seconds = parseInt(split[2]);
            let timeIntNew = hours * 3600 + minutes * 60 + seconds;
            timeInt = timeIntNew === 0 ? 1 : timeIntNew;
        } else {
            res.render('assignment-edit', {
                error: 'Invalid Time.',
                show_error: true
            });
            return;
        }
    }

    let realDate = null;
    if (date) {
        realDate = new Date(date);
    }

    if (!selectedDevice || !selectedInstance) {
        res.render('assignment-edit', {
            error: 'Invalid Request.',
            show_error: true
        });
        return;
    }

    let id = req.params.id;
    let oldAssignment;
    try {
        oldAssignment = await Assignment.getById(id);
    } catch (err) {
        console.error(`[UI] Failed to retrieve existing assignment with id ${oldInstanceName}-${oldDeviceUUID}-${oldTime}:`, err);
        res.render('assignment-edit', {
            error: 'Internal Server Error.',
            show_error: true
        });
        return;
    }

    try {
        let assignmentEnabled = enabled === 'on';
        let newAssignment = new Assignment(
            id,
            selectedInstance,
            selectedSourceInstance,
            selectedDevice,
            timeInt,
            realDate,
            assignmentEnabled
        );
        await newAssignment.save(id);
        AssignmentController.instance.editAssignment(oldAssignment, newAssignment);
    } catch (err) {
        console.error('[UI] Failed to save assignment:', err);
        res.render('assignment-edit', {
            error: 'Failed to save assignment.',
            show_error: true
        });
        return;
    }
    res.redirect('/assignments');
};

const editGeofencePost = async (req, res) => {
    const oldName = req.params.name;
    let name = req.body.name;
    let type = req.body.type || '';
    let area = req.body.area.replace('<br>', '').replace('\r\n', '\n');
    /*
    else {
        data["show_error"] = true
        data["error"] = "Invalid Request."
        return data
    */
    
    let newCoords = [];
    switch (type) {
        case GeofenceType.Circle:
            newCoords = Geofence.areaToCirclePoints(area);
            break;
        case GeofenceType.Geofence:
            newCoords = Geofence.areaToGeofences(area)
            break;
    }
    if (newCoords.length === 0) {
        res.render('geofence-edit', {
            show_error: true,
            error: 'Failed to parse coords.'
        });
        return;
    }
    
    let oldGeofence;
    try {
        oldGeofence = await Geofence.getByName(oldName);
    } catch (err) {
        res.render('geofence-edit', {
            show_error: true,
            error: 'Failed to update geofence. Is the name unique?'
        });
        return;
    }
    if (!oldGeofence) {
        res.render('geofence-edit', {
            show_error: true,
            error: 'Geofence Not Found'
        });
        return;
    } else {
        oldGeofence.name = name;
        oldGeofence.type = type;
        oldGeofence.data['area'] = newCoords;
        try {
            await oldGeofence.save(oldName);
        } catch {
            res.render('geofence-edit', {
                show_error: true,
                error: 'Failed to update geofence. Is the name unique?'
            });
        }
        res.redirect('/geofences');
    }
};

module.exports = router;
