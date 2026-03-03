const express = require('express');
const contactController = require('../controllers/contactController.js');

const router = express.Router();

// POST /identify
router.post('/', contactController.identify);

module.exports = router;
