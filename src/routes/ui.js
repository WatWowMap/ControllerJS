'use strict';

const express = require('express');
const router = express.Router();

const defaultData = require('../data/default.js');
const Account = require('../models/account.js');

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

router.use('/device/assign/:uuid', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Assign device to instance
    } else {
        res.render('device-assign', defaultData);
    }
});


// Instance routes
router.get('/instances', (req, res) => {
    res.render('instances', defaultData);
});

router.use('/instance/add', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Add instance to db
    } else {
        res.render('instance-add', defaultData);
    }
});

router.use('/instance/edit/:name', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Save instance in db
    } else {
        // TODO: Pull instance from db
        res.render('instance-edit', defaultData);
    }
});

// TODO: instance/delete

router.use('/settings', (req, res) => {
    if (req.method === 'POST') {
        // TODO: Update settings
    } else {
        // TODO: Provide settings to mustache
        res.render('settings', defaultData);
    }
});

router.use('/clearquests', (req, res) => {
    res.render('clearquests', defaultData);
});

module.exports = router;