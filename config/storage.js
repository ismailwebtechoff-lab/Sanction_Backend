const {CloudinaryStorage}=require('multer-storage-cloudinary');
const cloudinary=require('./cloudinary');

const storage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder:'profile',
        allowed_formats:['jpg','png','jpeg','webp'],
    
    },
});
module.exports=storage;