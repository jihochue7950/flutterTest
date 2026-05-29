'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/aiVideoProject.controller');

router.put   ('/:id', ctrl.updateScene);
router.delete('/:id', ctrl.deleteScene);
router.post  ('/:id/regenerate', ctrl.regenerateScene);

module.exports = router;
