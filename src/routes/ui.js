'use strict';

const express = require('express');
const router = express.Router();

const InstanceController = require('../controllers/instance-controller.js');
const defaultData = require('../data/default.js');
const InstanceType = require('../data/instance-type.js');
const Account = require('../models/account.js');
const Device = require('../models/device.js');
const Instance = require('../models/instance.js');
const Pokestop = require('../models/pokestop.js');

router.get(['/', '/index'], (req, res) => {
    res.render('index', defaultData);
});

// Account routes
router.get('/accounts', (req, res) => {
    // TODO: Provide account info
    res.render('accounts', defaultData);
});

router.use('/accounts/add', (req, res) => {
    if (req.method === 'POST') {
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
            data['show_error'] = true;
            data['error'] = 'Failed to parse accounts.';
        } else {
            try {
                accs.forEach(async acc => await acc.save(false));
            } catch (err) {
                data['show_error'] = true;
                data['error'] = 'Failed to save accounts.';
            }
        }
        res.redirect('/accounts');
    } else {
        res.render('accounts-add', defaultData);
    }
});


// Assignment routes
router.use('/assignments', (req, res) => {
    res.render('assignments', defaultData);
});

router.use('/assignment/add', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Add new assignment
    } else {
        res.render('assignment-add', defaultData);
    }
});

router.get('/assignment/delete', (req, res) => {
    res.render('assignment-delete', defaultData);
});

router.get('/assignment/start', (req, res) => {
    // TODO: Start assignment
    res.render('assignment-start', defaultData);
});

router.use('/assignment/edit/:name', (req, res) => {
    if (req.method === 'POST') {
        // Save assignment
    } else {
        // TODO: Pull assignment from db
        res.render('assignment-edit', defaultData);
    }
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
            let areaString = '';
            let oldInstanceData = oldInstance.data;
            switch (oldInstance.type) {
                case InstanceType.AutoQuest:
                case InstanceType.PokemonIV:
                    let areaType2 = oldInstanceData['area'];
                    if (areaType2) {
                        let index = 1;
                        areaType2.forEach(geofence => {
                            areaString += `[Geofence ${index}]\n`;
                            index++;
                            geofence.forEach(coordLine => {
                                let lat = coordLine['lat'];
                                let lon = coordLine['lon'];
                                areaString += `${lat},${lon}\n`;
                            });
                        });
                    }
                    break;
                default:
                    let areaType1 = oldInstanceData['area'];
                    if (areaType1) {
                        areaType1.forEach(coordLine => {
                            let lat = coordLine['lat'];
                            let lon = coordLine['lon'];
                            areaString += `${lat},${lon}\n`;
                        });
                    }
                    break;
            }

            data['old_name'] = oldInstance.name;
            data['name'] = oldInstance.name;
            data['area'] = areaString;
            data['min_level'] = oldInstanceData['min_level'] || 0;
            data['max_level'] = oldInstanceData['max_level'] || 29;
            data['timezone_offset'] = oldInstanceData['timezone_offset'] || 0;
            data['iv_queue_limit'] = oldInstanceData['iv_queue_limit'] || 100;
            data['spin_limit'] = oldInstanceData['spin_limit'] || 500;
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
                case InstanceType.GatherToken:
                case InstanceType.Leveling:
                    break;                
            }
        }
        res.render('instance-edit', data);
    }
});


router.use('/settings', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Update settings
    } else {
        // TODO: Provide settings to mustache
        res.render('settings', defaultData);
    }
});

router.use('/clearquests', (req, res) => {
    if (req.method === 'POST') {
        await Pokestop.clearQuests();
        res.redirect('/');
    } else {
        res.render('clearquests', defaultData);
    }
});

const addInstancePost = async (req, res) => {
    let data = {};
    let instanceName = req.params.name;
    let name = req.body.name;
    let area = req.body.area
        .replace('<br>', '\n')
        .replace('\r\n', '\n');
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

    let type = req.body.type;//Instance.fromString(req.body.type || '');
    let ivQueueLimit = parseInt(req.body.iv_queue_limit || 100);
    let spinLimit = parseInt(req.body.spin_limit || 500);

    //data['name'] = name;
    //data['area'] = area;
    //data['pokemon_ids'] = pokemonIDsText;
    //data['scatter_pokemon_ids'] = scatterPokemonIDsText;
    //data['min_level'] = minLevel;
    //data['max_level'] = maxLevel;
    //data['timezone_offset'] = timezoneOffset;
    //data['iv_queue_limit'] = ivQueueLimit;
    //data['spin_limit'] = spinLimit;

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
        data['show_error'] = true;
        data['error'] = 'Invalid Levels';
        return data;
    }

    let newCoords;
    if (type && type === InstanceType.CirclePokemon || type === InstanceType.CircleRaid || type === InstanceType.SmartCircleRaid) {
        let coords = [];
        let areaRows = area.split('\n');
        areaRows.forEach(areaRow => {
            let rowSplit = areaRow.split(',');
            if (rowSplit.length === 2) {
                let lat = parseFloat(rowSplit[0].trim());
                let lon = parseFloat(rowSplit[1].trim());
                if (lat && lon) {
                    coords.push({ lat, lon });
                }
            }
        });

        if (coords.length === 0) {
            data['show_error'] = true;
            data['error'] = 'Failed to parse coords.';
            return data;
        }
        newCoords = coords
    } else if (type && type === InstanceType.AutoQuest || type === InstanceType.PokemonIV) {
        //let coordArray: Coord[][] = [];
        let coordArray = [];
        let areaRows = area.split('\n');
        let currentIndex = 0;
        areaRows.forEach(areaRow => {
            let rowSplit = areaRow.split(',');
            if (rowSplit.length === 2) {
                let lat = parseFloat(rowSplit[0].trim());
                let lon = parseFloat(rowSplit[1].trim());
                if (lat && lon) {
                    while (coordArray.length !== currentIndex + 1) {
                        coordArray.push([]);
                    }
                    coordArray[currentIndex].push({ lat, lon });
                }
            } else if (areaRow.includes('[') && 
                       areaRow.includes(']') &&
                       coordArray.length > currentIndex && 
                       coordArray[currentIndex].length !== 0) {
                currentIndex++;
            }
        });

        if (coordArray.length === 0) {
            data['show_error'] = true;
            data['error'] = 'Failed to parse coords.';
            return data;
        }

        newCoords = coordArray;
    } else {
        data['show_error'] = true;
        data['error'] = 'Invalid Request.';
        return data;
    }

    if (instanceName) {
        // Update existing instance
        let oldInstance;
        try {
            oldInstance = await Instance.getByName(instanceName);
        } catch (err) {
            console.error('[UI] Failed to get existing instance with name:', instanceName);
            //data['show_error'] = true;
            //data['error'] = 'Failed to update instance. Is the name unique?';
            //return data;
            res.redirect('/instances');
        }
        if (!oldInstance) {
            res.send('Instance Not Found');
            return data;
        } else {
            let oldInstanceData = {};
            oldInstance.name = name;
            oldInstance.type = type;
            oldInstanceData['area'] = newCoords;
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
                //data['show_error'] = true;
                //data['error'] = 'Failed to update instance. Is the name unique?';
                //return data;
            }
            InstanceController.instance.reloadInstance(oldInstance, instanceName);
        }
    } else {
        // Create new instance
        let instanceData = {};
        instanceData['area'] = newCoords;
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
            await instance.save();
            InstanceController.instance.addInstance(instance);
        } catch (err) {
            console.error('[UI] Failed to create instance:', err);
            //data['show_error'] = true;
            //data['error'] = 'Failed to create instance. Is the name unique?';
            //return data;
        }
    }
    res.redirect('/instances');
};

module.exports = router;