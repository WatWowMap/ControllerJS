'use strict';

const express = require('express');
const i18n = require('i18n');
const router = express.Router();

const defaultData = require('../data/default.js');
const Assignment = require('../models/assignment.js');
const Device = require('../models/device.js');
const Instance = require('../models/instance.js');
const InstanceController = require('../controllers/instance-controller.js');

router.post('/accounts', async (req, res) => {
});

router.post('/assignments', async (req, res) => {
    const data = {};
    let assignments = await Assignment.getAll();
    if (assignments.length > 0) {
        assignments.forEach(x => {
            x.source_instance_name = x.sourceInstanceName;
            x.instance_name = x.instanceName;
            x.device_uuid = x.deviceUUID;
            x.time = {
                formatted: x.time === 0 ? 'On Complete' : zeroPad(parseInt(x.time / 3600), 2) + ':' + zeroPad(parseInt((x.time % 3600) / 60), 2) + ':' + zeroPad(parseInt((x.time % 3600) % 60), 2),
                timestamp: x.time
            };
            x.date = {
                formatted: (x.date || '').toLocaleString(),
                timestamp: x.date ? new Date(x.date).getTime() : 0
            };
            x.enabled = x.enabled ? 'Yes' : 'No';
            x.buttons = `
            <div class="btn-group" role="group">
                <a href="assignment/start/${x.id}" role="button" class="btn btn-success">Start</a>
                <a href="/assignment/edit/${x.id}" role="button" class="btn btn-primary">Edit</a>
                <a href="/assignment/delete/${x.id}" role="button" class="btn btn-danger" onclick="return confirm('Are you sure you want to delete auto-assignments with id ${x.id}?')">Delete</a>
            </div>
            `;
        });
        data.assignments = assignments;
    } else {
        data.assignments = [];
    }
    res.json({ data: data });
});

router.post('/devices', async (req, res) => {
    const data = {};
    let devices = await Device.getAll();
    if (devices.length > 0) {
        for (let i = 0; i < devices.length; i++) {
            let device = devices[i];
            //x.host = x.lastHost;
            //x.username = x.accountUsername;
            //x.instance = x.instanceName ? x.instanceName : '';
            device.last_seen = {
                formatted: new Date(device.lastSeen * 1000).toLocaleString(),
                sorted: device.lastSeen
            };
            device.buttons = `<a href="/device/assign/${encodeURIComponent(device.uuid)}" role="button" class="btn btn-primary">Assign Instance</a>`;
        }
    }
    data.devices = devices;
    res.json({ data: data });
});

router.post('/instances', async (req, res) => {
    const data = {};
    let instances = await Instance.getAll();
    if (instances.length > 0) {
        for (let i = 0; i < instances.length; i++) {
            let instance = instances[i];
            instance.type = Instance.fromString(instance.type);
            instance.status = await InstanceController.instance.getInstanceStatus(instance);
            instance.buttons = `<a href="/instance/edit/${encodeURIComponent(instance.name)}" role="button" class="btn btn-primary">Edit Instance</a>`;
        }
    }
    data.instances = instances;
    res.json({ data: data });
});

router.get('/ivqueue/:name', async (req, res) => {
    const name = req.params.name;
    const queue = InstanceController.instance.getIVQueue(name);
    const data = defaultData;
    data.instance_name = name;
    let ivqueue = [];
    for (let i = 0; i < queue.length; i++) {
        let pokemon = queue[i];
        ivqueue.push({
            id: i + 1,
            pokemon_image: `<img src="/static/img/pokemon/${pokemon.pokemonId}.png" style="height:50px; width:50px;">`,
            pokemon_name: i18n.__('poke_' + pokemon.pokemon_id) || '',
            pokemon_id: pokemon.pokemon_id,
            pokemon_spawn_id: pokemon.id,
            location: `${pokemon.lat},${pokemon.lon}`
        });
    }
    data.ivqueue = ivqueue;
    res.json({ data: data });
});

const zeroPad = (num, places) => String(num).padStart(places, '0');

module.exports = router;