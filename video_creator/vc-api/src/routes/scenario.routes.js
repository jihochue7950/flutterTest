'use strict';

const router = require('express').Router();
const { saveScenario } = require('../controllers/scenario.controller');

router.post('/:id/scenario', saveScenario);

module.exports = router;
