const Sanction = require("../models/sanction");
const Activity = require("../models/activity");
const cloudinary = require("../config/cloudinary");
const supabase = require("../config/supabase");
// const r2 = require("../config/r2");
// const {PutObjectCommand, DeleteObjectCommand,} = require("@aws-sdk/client-s3");
// const crypto = require("crypto");

// ============================================================
// Upload IMAGE to Cloudinary
// ============================================================

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "sanctions",
        resource_type: "image",
      },

      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer);
  });
};
// ============================================================
// Upload PDF to SUPABASE
// ============================================================

const uploadPdfToSupabase = async (file) => {
  const extension = file.originalname
    .split(".")
    .pop()
    .toLowerCase();

  const uniqueName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;

  const key = `sanctions/${uniqueName}.${extension}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(key, file.buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("Supabase PDF upload error:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(key);

  return {
    url: data.publicUrl,
    key,
  };
};
// ============================================================
// Upload document
//
// IMAGE → Cloudinary
// PDF   → Cloudflare R2
// ============================================================

const uploadDocument = async (file) => {

  if (!file) {
    return null;
  }

  // ----------------------------------------------------------
  // IMAGE
  // ----------------------------------------------------------

  if (file.mimetype.startsWith("image/")) {

    const result =
      await uploadImageToCloudinary(file);

    return {
      url: result.secure_url,
      storage: "cloudinary",
      fileType: "image",
      publicId: result.public_id,
    };
  }
  // ----------------------------------------------------------
  // PDF
  // ----------------------------------------------------------

  if (file.mimetype === "application/pdf") {
  const result =
    await uploadPdfToSupabase(file);

  return {
    url: result.url,
    storage: "supabase",
    fileType: "pdf",
    key: result.key,
  };
}
  throw new Error(
    "Only JPG, PNG, WEBP images and PDF files are allowed"
  );
};
// ============================================================
// Delete Cloudinary image
// ============================================================
const deleteCloudinaryFile = async (document) => {
  if (!document || !document.publicId) {
    return;
  }
  try {
     await cloudinary.uploader.destroy(
      document.publicId,
      { resource_type: "image", }
    );
  } catch (error) {
    console.error(
      "Cloudinary delete error:",
      error.message
    );
  }
};
// ============================================================
// Delete SupabaseFile
// ============================================================
const deleteSupabaseFile = async (document) => {

  if (!document || !document.key) {
    return;
  }

  try {

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([document.key]);

    if (error) {
      console.error(
        "Supabase delete error:",
        error.message
      );
    }

  } catch (error) {

    console.error(
      "Supabase delete error:",
      error.message
    );

  }
};
// ============================================================
// Delete document
// ============================================================

const deleteDocument = async (document) => {
  if (!document) {
    return;
  }
  if (document.storage === "cloudinary") {
    await deleteCloudinaryFile(document);
  } else if (document.storage === "supabase") {
    await deleteSupabaseFile(document);
  }
};
// ============================================================
// ADD SANCTION
// ============================================================
const addSanction = async (req, res) => {
  const uploadedDocuments = [];
  try {
    const {
      sanctionNumber,sanctionDate,customerName,referenceNumber,amount,invoiceNumber,remarks,} = req.body; 
    if (!sanctionNumber) {
      return res.status(400).json({  success: false,message: "Sanction number is required", });
    }
    if (!sanctionDate) {
      return res.status(400).json({success: false,message: "Sanction date is required",});
    }
    if (!customerName) {
      return res.status(400).json({success: false,message: "Customer name is required",});
    }
    if (amount === undefined ||amount === null ||amount === "") {
      return res.status(400).json({success: false,message: "Amount is required",});
    }

    const existingSanction =
      await Sanction.findOne({
        sanctionNumber,
      });


    if (existingSanction) {

      return res.status(400).json({
        success: false,
        message: "Sanction number already exists",
      });

    }
    // --------------------------------------------------------
    // Get uploaded files
    // --------------------------------------------------------

    const sanctionFile =
      req.files?.sanctionDocument?.[0];

    const k2File =
      req.files?.k2Document?.[0];

    const invoiceFile =
      req.files?.invoiceDocument?.[0];
    // --------------------------------------------------------
    // Upload files
    // --------------------------------------------------------

    let sanctionDocument = null;
    let k2Document = null;
    let invoiceDocument = null;

    if (sanctionFile) {

      sanctionDocument =
        await uploadDocument(sanctionFile);

      uploadedDocuments.push(
        sanctionDocument
      );
    }


    if (k2File) {

      k2Document =
        await uploadDocument(k2File);

      uploadedDocuments.push(
        k2Document
      );
    }


    if (invoiceFile) {

      invoiceDocument =
        await uploadDocument(invoiceFile);

      uploadedDocuments.push(
        invoiceDocument
      );
    }


    // --------------------------------------------------------
    // Create sanction
    // --------------------------------------------------------

    const sanction =
      await Sanction.create({sanctionNumber, sanctionDate, customerName, referenceNumber, amount, invoiceNumber,remarks,
createdBy: req.user.userId,sanctionDocument, k2Document, invoiceDocument,});
    // --------------------------------------------------------
    // Activity
    // --------------------------------------------------------
    await Activity.create({
      type: "SANCTION",
      action: "created",
      meta: {
        sanctionNumber,
        customerName,
      },
      targetId: sanction._id,
    });
    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(201).json({success: true,message: "Sanction added successfully",sanction,
    });
  } catch (error) {
    console.error("Error adding sanction:",  error );
    // --------------------------------------------------------
    // Cleanup uploaded files if DB creation fails
    // --------------------------------------------------------
    for (const document of uploadedDocuments) {
      await deleteDocument(document);
    }
    return res.status(500).json({success: false,message: "Failed to add sanction",error: error.message,});
  }
};


// ============================================================
// GET ALL SANCTIONS
// ============================================================

const getAllSanctions = async (req, res) => {

  try {

    const sanctions =
      await Sanction.find()
        .populate(
          "createdBy",
          "customId name username role"
        )
        .sort({
          createdAt: -1,
        });


    return res.status(200).json({

      success: true,

      count: sanctions.length,

      sanctions,
    });


  } catch (error) {

    console.error(
      "Error getting sanctions:",
      error
    );


    return res.status(500).json({

      success: false,

      message: "Failed to get sanctions",

      error: error.message,
    });
  }
};


// ============================================================
// GET SANCTION BY ID
// ============================================================

const getSanctionById = async (req, res) => {

  try {

    const sanction =
      await Sanction.findById(
        req.params.id
      ).populate(
        "createdBy",
        "customId name username role"
      );


    if (!sanction) {

      return res.status(404).json({

        success: false,

        message: "Sanction not found",
      });
    }


    return res.status(200).json({

      success: true,

      sanction,
    });


  } catch (error) {

    console.error(
      "Error getting sanction:",
      error
    );


    return res.status(500).json({

      success: false,

      message: "Failed to get sanction",

      error: error.message,
    });
  }
};


// ============================================================
// UPDATE SANCTION
// ============================================================

const updateSanction = async (req, res) => {

  const newlyUploadedDocuments = [];

  try {

    const {
      sanctionNumber,
      sanctionDate,
      customerName,
      referenceNumber,
      amount,
      invoiceNumber,
      remarks,
    } = req.body;


    // --------------------------------------------------------
    // Find sanction
    // --------------------------------------------------------

    const sanction =
      await Sanction.findById(
        req.params.id
      );


    if (!sanction) {

      return res.status(404).json({

        success: false,

        message: "Sanction not found",
      });
    }


    // --------------------------------------------------------
    // Check duplicate sanction number
    // --------------------------------------------------------

    if (
      sanctionNumber &&
      sanctionNumber !== sanction.sanctionNumber
    ) {

      const existingSanction =
        await Sanction.findOne({

          sanctionNumber,

          _id: {
            $ne: sanction._id,
          },

        });


      if (existingSanction) {

        return res.status(400).json({

          success: false,

          message: "Sanction number already exists",
        });
      }
    }


    // --------------------------------------------------------
    // Get new files
    // --------------------------------------------------------

    const sanctionFile =
      req.files?.sanctionDocument?.[0];

    const k2File =
      req.files?.k2Document?.[0];

    const invoiceFile =
      req.files?.invoiceDocument?.[0];


    // --------------------------------------------------------
    // Save old documents
    // --------------------------------------------------------

    const oldSanctionDocument =
      sanction.sanctionDocument;

    const oldK2Document =
      sanction.k2Document;

    const oldInvoiceDocument =
      sanction.invoiceDocument;


    // --------------------------------------------------------
    // Replace sanction document
    // --------------------------------------------------------

    if (sanctionFile) {

      const newDocument =
        await uploadDocument(
          sanctionFile
        );

      newlyUploadedDocuments.push(
        newDocument
      );

      sanction.sanctionDocument =
        newDocument;
    }


    // --------------------------------------------------------
    // Replace K2 document
    // --------------------------------------------------------

    if (k2File) {

      const newDocument =
        await uploadDocument(
          k2File
        );

      newlyUploadedDocuments.push(
        newDocument
      );

      sanction.k2Document =
        newDocument;
    }


    // --------------------------------------------------------
    // Replace invoice document
    // --------------------------------------------------------

    if (invoiceFile) {

      const newDocument =
        await uploadDocument(
          invoiceFile
        );

      newlyUploadedDocuments.push(
        newDocument
      );

      sanction.invoiceDocument =
        newDocument;
    }


    // --------------------------------------------------------
    // Update normal fields
    // --------------------------------------------------------

    if (sanctionNumber !== undefined) {

      sanction.sanctionNumber =
        sanctionNumber;
    }


    if (sanctionDate !== undefined) {

      sanction.sanctionDate =
        sanctionDate;
    }


    if (customerName !== undefined) {

      sanction.customerName =
        customerName;
    }


    if (referenceNumber !== undefined) {

      sanction.referenceNumber =
        referenceNumber;
    }


    if (amount !== undefined) {

      sanction.amount =
        amount;
    }


    if (invoiceNumber !== undefined) {

      sanction.invoiceNumber =
        invoiceNumber;
    }


    if (remarks !== undefined) {

      sanction.remarks =
        remarks;
    }


    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await sanction.save();


    // --------------------------------------------------------
    // Delete old files AFTER successful DB save
    // --------------------------------------------------------

    if (
      sanctionFile &&
      oldSanctionDocument
    ) {

      await deleteDocument(
        oldSanctionDocument
      );
    }


    if (
      k2File &&
      oldK2Document
    ) {

      await deleteDocument(
        oldK2Document
      );
    }


    if (
      invoiceFile &&
      oldInvoiceDocument
    ) {

      await deleteDocument(
        oldInvoiceDocument
      );
    }


    // --------------------------------------------------------
    // Activity
    // --------------------------------------------------------

    await Activity.create({

      type: "SANCTION",

      action: "updated",

      meta: {

        sanctionNumber:
          sanction.sanctionNumber,

        customerName:
          sanction.customerName,
      },

      targetId: sanction._id,
    });


    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({

      success: true,

      message: "Sanction updated successfully",

      sanction,
    });


  } catch (error) {

    console.error(
      "Error updating sanction:",
      error
    );


    // --------------------------------------------------------
    // Delete newly uploaded files if update failed
    // --------------------------------------------------------

    for (
      const document of newlyUploadedDocuments
    ) {

      await deleteDocument(document);
    }


    return res.status(500).json({

      success: false,

      message: "Failed to update sanction",

      error: error.message,
    });
  }
};


// ============================================================
// DELETE SANCTION
// ============================================================

const deleteSanction = async (req, res) => {

  try {

    // --------------------------------------------------------
    // Find sanction
    // --------------------------------------------------------

    const sanction =
      await Sanction.findById(
        req.params.id
      );


    if (!sanction) {

      return res.status(404).json({

        success: false,

        message: "Sanction not found",
      });
    }


    // --------------------------------------------------------
    // Delete sanction document
    // --------------------------------------------------------

    await deleteDocument(
      sanction.sanctionDocument
    );


    // --------------------------------------------------------
    // Delete K2 document
    // --------------------------------------------------------

    await deleteDocument(
      sanction.k2Document
    );


    // --------------------------------------------------------
    // Delete invoice document
    // --------------------------------------------------------

    await deleteDocument(
      sanction.invoiceDocument
    );


    // --------------------------------------------------------
    // Delete MongoDB document
    // --------------------------------------------------------

    await Sanction.findByIdAndDelete(
      req.params.id
    );


    // --------------------------------------------------------
    // Activity
    // --------------------------------------------------------

    await Activity.create({

      type: "SANCTION",

      action: "deleted",

      meta: {

        sanctionNumber:
          sanction.sanctionNumber,

        customerName:
          sanction.customerName,
      },

      targetId: sanction._id,
    });


    return res.status(200).json({

      success: true,

      message: "Sanction deleted successfully",
    });


  } catch (error) {

    console.error(
      "Error deleting sanction:",
      error
    );


    return res.status(500).json({

      success: false,

      message: "Failed to delete sanction",

      error: error.message,
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  addSanction,
  updateSanction,
  deleteSanction,
  getAllSanctions,
  getSanctionById,
};