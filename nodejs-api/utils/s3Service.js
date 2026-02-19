const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Initialize S3 client
const s3ClientConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY_ID,
  },
};

// Add MinIO-specific configuration if endpoint is provided
if (process.env.AWS_ENDPOINT) {
  s3ClientConfig.endpoint = process.env.AWS_ENDPOINT;
  s3ClientConfig.forcePathStyle = process.env.AWS_FORCE_PATH_STYLE === "true";
}

const s3Client = new S3Client(s3ClientConfig);

const bucket = process.env.S3_BUCKET_NAME;
const useS3 = Boolean(bucket);

// Fallback disk storage for dev when S3_BUCKET_NAME is not set
const diskStorage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.env.UPLOAD_PATH || "./uploads", subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = crypto.randomBytes(16).toString("hex");
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
    },
  });

const s3StorageEmail = useS3
  ? multerS3({
      s3: s3Client,
      bucket,
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(16).toString("hex");
        const extension = path.extname(file.originalname);
        cb(null, `email-templates/${Date.now()}-${uniqueSuffix}${extension}`);
      },
    })
  : diskStorage("email-templates");

const s3StorageReports = useS3
  ? multerS3({
      s3: s3Client,
      bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      contentDisposition: (req, file, cb) => cb(null, "inline"),
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(16).toString("hex");
        const extension = path.extname(file.originalname);
        cb(null, `third-party-reports/${Date.now()}-${uniqueSuffix}${extension}`);
      },
    })
  : diskStorage("third-party-reports");

// Configure multer for S3 or disk upload
const upload = multer({
  storage: s3StorageEmail,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const uploadThirdPartyReportFile = multer({
  storage: s3StorageReports,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

// Upload single image
const uploadSingleImage = upload.single("image");

const uploadSingleThirdPartyReportFile = uploadThirdPartyReportFile.single("file");

// Upload multiple images
const uploadMultipleImages = upload.array("images", 10); // Max 10 images

// Generate S3 URL
const generateS3Url = (key) => {
  return `${process.env.AWS_S3_BASE_URL}/${key}`;
};

// Delete file from S3
const deleteFileFromS3 = async (key) => {
  if (!process.env.S3_BUCKET_NAME) return false;
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
};

// Extract key from S3 URL
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || "";
    const keyFromPath = pathname.replace(/^\//, "");
    if (!keyFromPath) return null;

    // If a bucket name is configured, validate URL shape matches either:
    // - https://<bucket>.s3.<region>.amazonaws.com/<key> (virtual-hosted style)
    // - https://s3.<region>.amazonaws.com/<bucket>/<key> (path style)
    // - Custom base URL configured via AWS_S3_BASE_URL
    const bucket = process.env.S3_BUCKET_NAME;
    const baseUrl = process.env.AWS_S3_BASE_URL;

    if (baseUrl && url.startsWith(baseUrl + "/")) {
      return url.slice((baseUrl + "/").length);
    }

    if (!bucket) {
      return keyFromPath;
    }

    const host = (parsed.hostname || "").toLowerCase();
    const bucketLower = bucket.toLowerCase();

    // virtual-hosted style: <bucket>.s3...
    if (host.startsWith(`${bucketLower}.`)) {
      return keyFromPath;
    }

    // path style: .../<bucket>/<key>
    if (keyFromPath.startsWith(bucketLower + "/")) {
      return keyFromPath.slice(bucketLower.length + 1);
    }

    // Last resort: return the path as key
    return keyFromPath;
  } catch {
    return null;
  }
};

// Delete multiple files from S3
const deleteMultipleFilesFromS3 = async (urls) => {
  if (!Array.isArray(urls)) return;

  const deletePromises = urls.map((url) => {
    const key = extractKeyFromUrl(url);
    return key ? deleteFileFromS3(key) : Promise.resolve(false);
  });

  return Promise.all(deletePromises);
};

module.exports = {
  s3Client,
  upload,
  uploadSingleImage,
  uploadSingleThirdPartyReportFile,
  uploadMultipleImages,
  generateS3Url,
  deleteFileFromS3,
  deleteMultipleFilesFromS3,
  extractKeyFromUrl,
};
