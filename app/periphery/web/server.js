const express = require('express');
const config = require('../../config');
const app = express();

function setupRoutes(app) {
    app.use('/lockers', require('./endpoints/public/lockers'));
}

function setupApplication() {
    setupRoutes(app);
}

function startServer() {
    setupApplication();
    app.listen(config.serverPort);
}

module.exports = startServer;