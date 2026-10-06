const express = require("express");
const router = express.Router();
const {getActivityList , getAllActivities} = require("../controller/activity");
const verifyToken = require('../middleware/auth')
const authorizeRoles = require('../middleware/authorize')

router.get('/',verifyToken,authorizeRoles('Admin'),getAllActivities);
router.get("/dashboard",verifyToken,authorizeRoles('Admin'), getActivityList);      // /activities/dashboard

module.exports = router;