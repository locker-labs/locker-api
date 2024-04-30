const express = require('express');
const app = express();


function setupRoutes(app) {
    app.use('/users', require('./endpoints/public/lockers'));
}

function setupApplication() {
    setupRoutes(app);
}

function startServer() {
    setupApplication();
    console.log("About to listen on port 3000")
    app.listen(process.env.PORT || 3000);
}

module.exports = startServer;