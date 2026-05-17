const router  = require('express').Router();
const multer  = require('multer');
const XLSX    = require('xlsx');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
    ].includes(file.mimetype);
    cb(null, ok);
  }
});

const parseExcelOrCsv = (buffer, mimetype) => {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
};

/* POST /api/imports/upload  */
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { doc_type } = req.body;
  if (!doc_type) return res.status(400).json({ error: 'doc_type required' });

  let rows = [];
  let errorDetails = null;

  try {
    if (req.file.mimetype === 'application/pdf') {
      rows = [{ info: 'PDF — manual review required', pages: 1 }];
    } else {
      rows = parseExcelOrCsv(req.file.buffer, req.file.mimetype);
    }
  } catch (parseErr) {
    return res.status(422).json({ error: 'Cannot parse file: ' + parseErr.message });
  }

  const { rows: last } = await db.query(
    'SELECT import_no FROM document_imports ORDER BY created_at DESC LIMIT 1');
  const lastNo = last.length ? parseInt(last[0].import_no.replace('IMP-',''),10) : 40;
  const import_no = `IMP-${String(lastNo+1).padStart(4,'0')}`;

  // Dry-run validation
  let successCount = 0, errorCount = 0;
  const validatedRows = rows.map((row, idx) => {
    const issues = [];
    if (doc_type === 'so' && !row['เลขที่ SO'] && !row['so_no'])
      issues.push('Missing SO number');
    if (doc_type === 'grn' && !row['น้ำหนัก (กก.)'] && !row['qty'])
      issues.push('Missing quantity');
    if (issues.length) { errorCount++; return { ...row, _row: idx+1, _issues: issues }; }
    successCount++;
    return { ...row, _row: idx+1, _issues: [] };
  });

  // Save import record
  const { rows: saved } = await db.query(
    `INSERT INTO document_imports(import_no,doc_type,file_name,file_size,row_count,
       success_count,error_count,status,error_details,target_module,imported_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [import_no, doc_type, req.file.originalname, req.file.size,
     rows.length, successCount, errorCount,
     errorCount > 0 ? (successCount > 0 ? 'warning' : 'error') : 'success',
     errorCount > 0 ? JSON.stringify(validatedRows.filter(r=>r._issues?.length)) : null,
     docTypeToModule(doc_type), req.user.id]
  );

  res.json({
    import: saved[0],
    preview: validatedRows.slice(0, 50),
    totalRows: rows.length,
    successCount,
    errorCount,
  });
});

/* GET /api/imports  */
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT di.*,u.first_name||' '||u.last_name AS imported_by_name
       FROM document_imports di
       LEFT JOIN users u ON u.id=di.imported_by
       ORDER BY di.created_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* POST /api/imports/manual  */
router.post('/manual', async (req, res) => {
  try {
    const { doc_type, rows: dataRows } = req.body;
    if (!doc_type || !Array.isArray(dataRows))
      return res.status(400).json({ error: 'doc_type and rows required' });

    const { rows: last } = await db.query(
      'SELECT import_no FROM document_imports ORDER BY created_at DESC LIMIT 1');
    const lastNo = last.length ? parseInt(last[0].import_no.replace('IMP-',''),10) : 40;
    const import_no = `IMP-${String(lastNo+1).padStart(4,'0')}`;

    const { rows: saved } = await db.query(
      `INSERT INTO document_imports(import_no,doc_type,file_name,row_count,
         success_count,status,target_module,imported_by)
       VALUES($1,$2,'manual_input.csv',$3,$4,'success',$5,$6) RETURNING *`,
      [import_no,doc_type,dataRows.length,dataRows.length,
       docTypeToModule(doc_type),req.user.id]
    );
    res.status(201).json(saved[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function docTypeToModule(dt) {
  const map = {
    po:'orders',so:'orders',grn:'receiving',invoice:'finance',
    payment:'finance',dn:'delivery',wo:'production',
    qc_report:'qc',stockadj:'inventory',
  };
  return map[dt] || dt;
}

module.exports = router;
