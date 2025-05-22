const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_BUCKET_NAME;

// Upload file to S3
exports.uploadToS3 = async (file) => {
  const fileContent = fs.readFileSync(file.path);
  const ext = path.extname(file.originalname);
  const key = `uploads/${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: file.mimetype
    // ACL: 'public-read' // REMOVE this line for buckets that do not allow ACLs
  };

  await s3.upload(params).promise();
  // Remove local file after upload
  fs.unlinkSync(file.path);

  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

// Delete file from S3
exports.deleteFromS3 = async (key) => {
  const params = {
    Bucket: BUCKET,
    Key: key
  };
  await s3.deleteObject(params).promise();
};
