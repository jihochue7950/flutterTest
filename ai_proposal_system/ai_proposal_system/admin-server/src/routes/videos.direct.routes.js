const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const { setActiveVideo, deleteVideo } = require('../controllers/videos.controller');

router.use(auth);
router.put('/:videoId/active', setActiveVideo);
router.delete('/:videoId', deleteVideo);

module.exports = router;
