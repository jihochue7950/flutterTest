'use strict';

const router = require('express').Router();
const { photoUpload } = require('../config/upload');
const { uploadPhotos, getPhotos, reorderPhotos, deletePhoto } = require('../controllers/photos.controller');

router.post(  '/:id/photos',                  photoUpload.array('photos', 30), uploadPhotos);
router.get(   '/:id/photos',                  getPhotos);
router.put(   '/:id/photos/reorder',          reorderPhotos);
router.delete('/:id/photos/:photoId',         deletePhoto);

module.exports = router;
