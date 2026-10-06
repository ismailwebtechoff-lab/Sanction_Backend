const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/connectionDB');
require('dotenv').config();

connectDB();

const app = express();

app.use(cors(
    {
        origin: process.env.CLIENT_URL,
        credentials: true,
    }
));

app.use(cookieParser());
app.use(express.json());


const PORT = process.env.PORT;

   app.use("/sanction",require("./routes/sanction"));      
   app.use("/activityList",require("./routes/activity"))
   app.use("/user", require("./routes/user"));
   //app.use("/profile",require("./routes/profile"));
   

   // Its dummy API call for awake server 
   app.get('/health',(req,res)=>{
      res.status(200).json({status:'ok',timestamp:Date.now()});
   })

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});