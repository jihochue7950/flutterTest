const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { getVideos, uploadVideo, setActiveVideo, deleteVideo } = require('../controllers/videos.controller');

router.use(auth);
router.get('/', getVideos);
router.post('/', uploadSingle, uploadVideo);
router.put('/:videoId/active', setActiveVideo);
router.delete('/:videoId', deleteVideo);

module.exports = router;
