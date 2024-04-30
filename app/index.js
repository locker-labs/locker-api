const startServer = require('./periphery/web/server');

if (require.main === module) {
    console.log("Starting server...")
    startServer();
}