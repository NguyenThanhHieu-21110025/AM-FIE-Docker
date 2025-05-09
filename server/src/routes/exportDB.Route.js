const express = require('express');
const { parse } = require('json2csv');  
const exportDB  = require('../Controller/exportDB.Controller'); 


const router = express.Router();


// Lấy danh sách các type có sẵn
router.get('/export/types', exportDB.getAvailableTypes);
// Export theo type cụ thể
router.get('/export/:type', exportDB.exportDB);
// Export nhiều types (POST request với body chứa array types)
router.post('/export/multiple', exportDB.exportMultipleTypes);

module.exports = router;
