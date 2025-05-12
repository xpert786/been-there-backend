const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    console.log('ext',ext);
    if(ext === 'svg+xml'){
      newext = ext.replace(/\+xml$/, '');
      cb(null, `${Date.now()}.${newext}`);
    }
    else{
      cb(null, `${Date.now()}.${ext}`);
    }
    // cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
    // console.log('ext',ext);

  },
});

const fileFilter = (req, file, cb) => {
  // console.log(file.mimetype)
  if (
    file.mimetype === "image/png" ||
     file.mimetype === "image/svg+xml" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "video/mp4" ||
    file.mimetype === "video/mpeg" ||
    file.mimetype === "video/quicktime"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;
