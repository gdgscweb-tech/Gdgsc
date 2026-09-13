const multer = require('multer');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const GoogleDriveStorageService = require('../services/storage/GoogleDriveStorageService');
const { getStorageRootConfig } = require('./storageConfig');
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    cb(['image/jpeg','image/png','image/gif','image/webp'].includes(file.mimetype) ? null : new Error('Unsupported banner image type'), true);
  }
});
const upload = { single(field) { return (req, res, next) => {
  parser.single(field)(req, res, async error => {
    if (error) return next(error);
    if (!req.file) return next();
    let directory;
    try {
      const root = getStorageRootConfig();
      const storage = new GoogleDriveStorageService();
      const { id: folderId } = await storage.ensureFolder(root.folderId, 'events');
      const eventStorage = new GoogleDriveStorageService({ folderId, environment: root.environment });
      directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gdgsc-event-'));
      const filePath = path.join(directory, 'banner');
      await fs.writeFile(filePath, req.file.buffer);
      const name = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uploaded = await eventStorage.uploadFile({key:`events/${Date.now()}-${name}`,filePath,contentType:req.file.mimetype,size:req.file.size});
      if (!uploaded.fileId) throw Error('Drive did not return a file ID');
      req.file.path = `/api/assets/drive/${uploaded.fileId}`;
      delete req.file.buffer;
      next();
    } catch (failure) {
      failure.message = 'Drive banner upload failed. You can upload the banner manually into the environment events folder and paste its Drive link. ' + failure.message;
      next(failure);
    } finally {
      if (directory) await fs.rm(directory, {recursive:true,force:true});
    }
  });
}; }};
module.exports = { upload };

