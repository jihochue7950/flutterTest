const express = require('express');
const router = express.Router();
const { getProposalData } = require('../controllers/proposal.controller');

// Public API - no auth required (called by the main backend server)
router.get('/:userCode/proposal-data', getProposalData);

module.exports = router;
