const express = require("express");
const router = express.Router();
const rankingController = require("../controllers/rankingController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/:id_torneo/resultado", authMiddleware, adminMiddleware, rankingController.registrarResultado);
router.get("/:id_torneo/ranking", authMiddleware, rankingController.verRanking);

module.exports = router;
