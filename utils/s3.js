const AWS = require('aws-sdk');
const path = require('path');
<<<<<<< HEAD
=======
const fs = require('fs');
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_BUCKET_NAME;

<<<<<<< HEAD
// Upload image to S3 from multipart/form-data (req.file)
exports.uploadToS3 = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('File buffer not found');
  }

=======
// Upload file to S3
exports.uploadToS3 = async (file) => {
  const fileContent = fs.readFileSync(file.path);
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e
  const ext = path.extname(file.originalname);
  const key = `uploads/${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
<<<<<<< HEAD
    Body: file.buffer,
    ContentType: file.mimetype
    // ACL: 'public-read' // Uncomment only if public access is needed and allowed
  };

  await s3.upload(params).promise();

  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
=======
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
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e
