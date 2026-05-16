const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { RepairAttachment, RepairTimeLog, RepairTicket } = require('../db/models');

router.use(auth);

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.user.storeId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|heic/i;
    const ok = allowed.test(path.extname(file.originalname)) || allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only images and PDFs allowed'));
  },
});

// POST upload attachment to a repair
router.post('/repairs/:repairId', upload.array('files', 10), async (req, res) => {
  try {
    const repair = await RepairTicket.findOne({ where: { id: req.params.repairId, storeId: req.user.storeId } });
    if (!repair) return res.status(404).json({ error: 'Repair not found' });

    const created = await Promise.all(req.files.map(f => RepairAttachment.create({
      id: uuidv4(),
      repairId: req.params.repairId,
      storeId: req.user.storeId,
      userId: req.user.id,
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      url: `/uploads/${req.user.storeId}/${f.filename}`,
    })));

    res.json({ attachments: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET attachments for a repair
router.get('/repairs/:repairId/attachments', async (req, res) => {
  try {
    const attachments = await RepairAttachment.findAll({
      where: { repairId: req.params.repairId, storeId: req.user.storeId },
      order: [['createdAt', 'ASC']],
    });
    res.json(attachments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE attachment
router.delete('/attachments/:id', async (req, res) => {
  try {
    const att = await RepairAttachment.findOne({ where: { id: req.params.id, storeId: req.user.storeId } });
    if (!att) return res.status(404).json({ error: 'Not found' });
    const filePath = path.join(UPLOAD_DIR, req.user.storeId, att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await att.destroy();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST start timer for a repair
router.post('/repairs/:repairId/timer/start', async (req, res) => {
  try {
    const { notes } = req.body;
    const log = await RepairTimeLog.create({
      id: uuidv4(),
      repairId: req.params.repairId,
      userId: req.user.id,
      storeId: req.user.storeId,
      startedAt: new Date(),
      notes: notes || '',
    });
    res.json(log);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST stop timer
router.post('/timer/:logId/stop', async (req, res) => {
  try {
    const log = await RepairTimeLog.findOne({ where: { id: req.params.logId, storeId: req.user.storeId } });
    if (!log) return res.status(404).json({ error: 'Not found' });
    const endedAt = new Date();
    const minutes = Math.round((endedAt - new Date(log.startedAt)) / 60000);
    await log.update({ endedAt, minutes });
    res.json(log);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET time logs for a repair
router.get('/repairs/:repairId/timelogs', async (req, res) => {
  try {
    const logs = await RepairTimeLog.findAll({
      where: { repairId: req.params.repairId, storeId: req.user.storeId },
      order: [['startedAt', 'DESC']],
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
