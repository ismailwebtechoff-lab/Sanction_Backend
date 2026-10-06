const express = require('express');
const router=express.Router();
const upload = require('../middleware/upload');

const {addSanction,updateSanction,deleteSanction,getAllSanctions,} = require("../controllers/sanction");
const verifyToken = require('../middleware/auth')
const authorizeRoles = require('../middleware/authorize')

router.get("/",verifyToken,getAllSanctions)  //Get all sanction
router.post('/',verifyToken, authorizeRoles('Admin'),upload.fields([
    { name: "sanctionDocument", maxCount: 1,},
    { name: "k2Document", maxCount: 1,},
    { name: "invoiceDocument", maxCount: 1,},]),addSanction);    //add sanction 
router.put("/:id",verifyToken, authorizeRoles('Admin'),upload.fields([
    {  name: "sanctionDocument",  maxCount: 1,},
    { name: "k2Document",  maxCount: 1,},
    {  name: "invoiceDocument", maxCount: 1,},]), updateSanction) //edit sanction
router.delete("/:id",verifyToken, authorizeRoles('Admin'),deleteSanction) //delete sanction

module.exports=router

