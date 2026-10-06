const mongoose = require("mongoose");
const activitySchema = new mongoose.Schema({
  type: {type:String,required:true},
  action:{type:String,required:true},
  meta: { type: String, required: true },
  targetId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
      },
},{timestamps:true});

module.exports = mongoose.model("Activity", activitySchema);