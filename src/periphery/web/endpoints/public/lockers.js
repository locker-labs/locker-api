const express = require("express");
const morgan = require("morgan");
const { logger, stream } = require("../../../../dependencies");

const router = express.Router();
router.use(express.json());
router.use(morgan("combined", { stream }));

router.get("/", (req, res) => {
	res.status(200).send({ message: "Hello World." });
});

module.exports = router;
