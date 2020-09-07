'use strict';

const express = require('express');
const router = express.Router();

const defaultData = require('../data/default.js');
const Assignment = require('../models/assignment.js');
const Device = require('../models/device.js');
const Instance = require('../models/instance.js');

router.post('/accounts', async (req, res) => {
});

router.post('/assignments', async (req, res) => {
    const data = defaultData;
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
                timestamp: x.date ? x.date.getTime() : 0
            };
            x.enabled = x.enabled ? 'Yes' : 'No';
            x.buttons = `
            <div class="btn-group" role="group">
                <a href="assignment/start/${x.id}" role="button" class="btn btn-success">Start</a>
                <a href="/assignment/edit/${x.id}" role="button" class="btn btn-primary">Edit</a>
                <a href="/assignment/delete/${x.id}" role="button" class="btn btn-danger">Delete</a>
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
    const data = defaultData;
    let devices = await Device.getAll();
    devices.forEach(x => {
        //x.host = x.lastHost;
        //x.username = x.accountUsername;
        //x.instance = x.instanceName ? x.instanceName : '';
        x.last_seen = {
            formatted: new Date(x.lastSeen * 1000).toLocaleString(),
            sorted: x.lastSeen
        };
        x.last_lat = x.lastLat;
        x.last_lon = x.lastLon;
        x.buttons = `<a href="/device/assign/${encodeURIComponent(x.uuid)}" role="button" class="btn btn-primary">Assign Instance</a>`;
    });
    data.devices = devices;
    res.json({ data: data });
});

router.post('/instances', async (req, res) => {
    const data = defaultData;
    let instances = await Instance.getAll();
    instances.forEach(x => {
        x.status = '';
        x.buttons = `<a href="/instance/edit/${encodeURIComponent(x.name)}" role="button" class="btn btn-primary">Edit Instance</a>`;
    });
    data.instances = instances;
    res.json({ data: data });
});

const zeroPad = (num, places) => String(num).padStart(places, '0');

module.exports = router;