// routes/addressRoutes.js
const express = require('express');
const router = express.Router();
const roomController = require("../Controller/roomController");
const middlewareController = require("../middleware/middleware");

router.post('/', middlewareController.verifyToken, roomController.createRoom);   
router.get('/', middlewareController.verifyToken, roomController.getAllRoom);   
router.get('/:id', middlewareController.verifyToken, roomController.getRoomById); 
router.put('/:id', middlewareController.verifyToken, roomController.updateRoom); 
router.delete('/:id', middlewareController.verifyToken, roomController.deleteRoom); 

module.exports = router;
