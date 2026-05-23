'use strict';

const router = require('express').Router();
const { createProject, getProject, getStatus, getPreviewJson } = require('../controllers/projects.controller');

router.post('/',                    createProject);
router.get('/:id',                  getProject);
router.get('/:id/status',           getStatus);
router.get('/:id/preview-json',     getPreviewJson);

module.exports = router;
