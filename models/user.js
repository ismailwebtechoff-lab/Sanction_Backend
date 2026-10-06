const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  customId: {type:String,required:true},
  name:{type:String,required:true},
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required:true },
  status:{ type: String, enum: ["Active", "Inactive"], default: "Active" },
},{timestamps:true});

module.exports = mongoose.model("User", userSchema);