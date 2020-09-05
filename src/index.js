'use strict';

const express = require('express');
const app = express();

const config = require('./config.json');
const AssignmentController = require('./controllers/assignment-controller.js');
const RouteController = require('./routes/index.js');
const routes = new RouteController();

// TODO: Fix iv jobs sent twice sometimes
// TODO: Polygon checks
// TODO: Reload instances on change
// TODO: ControllerUI
// TODO: GotIV

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));

// Set HTTP routes
app.get('/', (req, res) => res.send('OK'));
app.post(['/controler', '/controller'], async (req, res) => await routes.handleControllerData(req, res));

// Start HTTP listener
app.listen(config.port, config.host, () => console.log(`Listening on ${config.host}:${config.port}...`));

// Start assignment controller
AssignmentController.instance.setup();