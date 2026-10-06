
const Activity = require("../models/activity");

// Get 20 lists for dashboard

const getActivityList = async(req,res)=>{
        try{
        const activityList = await Activity.find().sort({ createdAt: -1 }).limit(20);
        return res.json(activityList)
        }
        catch(err){
            res.status(500).json({ message: 'Failed to fetch activities', error: err.message });            
        }
       
}

// GET ALL ACTIVITYLIST
const getAllActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // default to page 1
    const limit = parseInt(req.query.limit) || 20; // default 20 per page

    const skip = (page - 1) * limit;

    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments();

    res.status(200).json({
      activities,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activities', error: err.message });
  }
};

module.exports = { getActivityList, getAllActivities}