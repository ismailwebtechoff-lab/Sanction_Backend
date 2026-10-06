const mongoose = require('mongoose');

const connectDB = async()=>{
    await mongoose.connect(process.env.CONNECTION_STRING)
    .then(()=>console.log("DB connected"))
    .catch((err)=>console.error("Connection error:",err))
}

module.exports=connectDB