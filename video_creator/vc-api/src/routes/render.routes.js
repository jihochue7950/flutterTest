'use strict';

const router = require('express').Router();
const { getRenderStatus, getDownloadUrl } = require('../controllers/render.controller');

router.get('/:id/render-status', getRenderStatus);
router.get('/:id/download',      getDownloadUrl);

module.exports = router;
