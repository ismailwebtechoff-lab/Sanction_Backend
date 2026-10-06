const express = require('express');
const router=express.Router();
const {login,logOut, check,register,getAllUser,updateUser,deleteUser,getUser} = require("../controller/user");
const verifyToken = require('../middelware/auth');
const authorizeRoles = require('../middelware/authorize')

router.post("/login",login); //for login to the app
router.post("/logout",logOut); // for logout from the app
router.get("/check",verifyToken,check); // for checking the tpken
router.post("/register",verifyToken,authorizeRoles('Admin'),register); // for creating new user
router.post("/sample",register); // for creating new user
router.get("/getUser",getAllUser); // for viewing all users name
router.get("/:id",verifyToken,getUser); // for viewing particular user
router.put("/:id", verifyToken,authorizeRoles('Admin'),updateUser); // for changing the status of the user
router.delete("/:id",verifyToken,authorizeRoles('Admin') , deleteUser); // for removing the user from the app

module.exports= router;