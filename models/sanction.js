const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },

    storage: {
      type: String,
      enum: ["cloudinary", "r2"],
      required: true,
    },

    fileType: {
      type: String,
      enum: ["image", "pdf"],
      required: true,
    },

    publicId: {
      type: String,
    },

    key: {
      type: String,
    },
  },
  { _id: false }
);

const sanctionSchema = new mongoose.Schema(
  {
    sanctionNumber: {
      type: String,
      required: true,
    },

    sanctionDate: {
      type: Date,
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    referenceNumber: {
      type: String,
      
    },

    amount: {
      type: Number,
      required: true,
    },

    invoiceNumber: {
      type: String,
     
    },

    remarks: {
      type: String,
      
    },
    createdBy:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
    sanctionDocument: documentSchema,

    k2Document: documentSchema,

    invoiceDocument: documentSchema,
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Sanction", sanctionSchema);