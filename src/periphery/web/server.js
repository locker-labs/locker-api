const express = require("express");
const app = express("");

const config = require("../../config");
const getOrCreatePool = require("../db/connect");

function setupRoutes(app) {
	app.use("/lockers", require("./endpoints/public/lockers"));
}

async function startup() {
	await getOrCreatePool();
}

async function setupApp() {
	await startup();
	setupRoutes(app);
}

function startServer() {
	setupApp();
	app.listen(config.serverPort);
}

module.exports = startServer;
