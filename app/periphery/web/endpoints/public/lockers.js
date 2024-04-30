const express = require("express");

const router = express.Router();
router.use(express.json());


router.get('/', (req, res) => {
    console.log(req.query.name)
    res.status(200).send({ message: "Hello World." });
})

module.exports = router;