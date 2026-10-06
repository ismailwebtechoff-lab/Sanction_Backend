const express = require("express");
const router = express.Router();
const {getActivityList , getAllActivities} = require("../controller/activity");
const verifyToken = require('../middelware/auth')
const authorizeRoles = require('../middelware/authorize')

router.get('/',verifyToken,authorizeRoles('Admin'),getAllActivities);
router.get("/dashboard",verifyToken,authorizeRoles('Admin'), getActivityList);      // /activities/dashboard

module.exports = router;