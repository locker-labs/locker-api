const startServer = require('./periphery/web/server');
const { logger } = require('./dependencies');

if (require.main === module) {
    logger.info("Starting server.")
    startServer();
}