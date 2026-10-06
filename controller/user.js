const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Activity = require("../models/activity");

// Helper to format ID like U00001
const generateCustomId = async () => {
  const lastUser = await User.findOne({ customId: { $exists: true } })
    .sort({ createdAt: -1 }) // newest user first
    .select("customId");

  let newNumber = 1;
  if (lastUser && lastUser.customId) {
    const lastNumber = parseInt(lastUser.customId.replace("U", ""));
    newNumber = lastNumber + 1;
  }

  return `U${newNumber.toString().padStart(5, "0")}`;
};


//Register new user
const register = async(req,res)=>{
  const {name,username,password,role,status} = req.body;
  if (!username || !password) {
        return res.status(400).json({ message: "username and password is required" })
    }
  try{
    let user = await User.findOne({username});
    if(user){
      return res.status(400).json({error:"Username is already exist"})
    }
    const hashPwd = await bcrypt.hash(password, 10)
    const customId = await generateCustomId();
    const newUser = await User.create({customId,name,username,password:hashPwd,role,status});
    
     await Activity.create({
              type: 'USER',
              action: 'created',
              meta: {
                username, // username
                name, //  names
              },
              targetId: newUser._id,
            });
  
          res.status(201).json({message:"User added successfully",user:newUser});
          }catch(err){
              console.error("Error adding User:",err);
              res.status(500).json({message:"Server Error",error:err.message});
          }

}



//login
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch )
      return res.status(400).json({ message: "Invalid Password" });

    const token = jwt.sign({ userId: user._id, role: user.role, name: user.name }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }).json({ message: "Login successful",success: true,user: { role: user.role, username: user.username,name:user.name }} );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getAllUser = async(req,res)=>{
    const users = await User.find()
    return res.json(users);
}

const getUser = async(req,res)=>{
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error fetching user" });
  }
}

 //logout
const logOut= (req, res) => {
  res.clearCookie("token", {
  httpOnly: true,
  secure: true,
  sameSite: "None",
}).json({ message: "Logged out" });
}

//check
const check= async (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role,name: req.user.name });
}


// Update the user details
const updateUser = async (req, res) => {
  try {
    const { name, password, status, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update name
    if (name !== undefined) {
      user.name = name;
    }

    // Update password only if provided
    if (password !== undefined && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }

    // Update status
    if (status !== undefined) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      user.status = status;
    }

    // Update role
    if (role !== undefined) {
      user.role = role;
    }

    await user.save();

    // Activity log
    await Activity.create({
      type: "USER",
      action: "updated",
      meta: {
        username: user.username,
        name: user.name,
      },
      targetId: user._id,
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        _id: user._id,
        customId: user.customId,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error updating User:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update User",
      error: error.message,
    });
  }
};
//Delete the user
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete User", error: error.message });
  }
};
module.exports ={login,logOut,check,register,getAllUser,updateUser,deleteUser,getUser}