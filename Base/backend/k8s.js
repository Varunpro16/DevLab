// backend/routes/kubeRoutes.js

const express = require('express');
const router = express.Router();
const path = require('path');
const { log } = require('console');




router.post('/create-environment', async (req, res) => {
  const {  template, projectName } = req.body;

  
});

module.exports = router;
