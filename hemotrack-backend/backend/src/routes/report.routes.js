const router = require('express').Router();
const { BloodExam, ExamResult, ExamType, UserProfile, UserSettings } = require('../models');
const authenticate = require('../middleware/auth.middleware');
const { getAdapter } = require('../shared/gateways/ai/ai-gateway.factory');

// GET /api/reports/:examTypeId?profileId=X
// Returns comparative data for chart
router.get('/:examTypeId', authenticate, async (req, res, next) => {
  try {
    const { examTypeId } = req.params;
    const { profileId } = req.query;

    const profileWhere = { userId: req.user.id };
    if (profileId) profileWhere.id = profileId;

    const exams = await BloodExam.findAll({
      where: { examTypeId, status: 'completed' },
      include: [
        { model: UserProfile, where: profileWhere, attributes: ['id', 'name'] },
        { model: ExamResult },
        { model: ExamType, attributes: ['id', 'name', 'category', 'markers'] },
      ],
      order: [['examDate', 'ASC']],
    });

    if (exams.length === 0) {
      return res.json({ success: true, data: { exams: [], markers: [], series: [] } });
    }

    // Build chart series grouped by marker
    const markersMap = {};
    exams.forEach(exam => {
      exam.ExamResults.forEach(result => {
        if (!markersMap[result.markerName]) {
          markersMap[result.markerName] = {
            name: result.markerName,
            unit: result.unit,
            refMin: result.refMin,
            refMax: result.refMax,
            data: [],
          };
        }
        markersMap[result.markerName].data.push({
          date: exam.examDate,
          value: result.value,
          status: result.getStatus(),
          examId: exam.id,
        });
      });
    });

    res.json({
      success: true,
      data: {
        examType: exams[0].ExamType,
        exams: exams.map(e => ({
          id: e.id,
          examDate: e.examDate,
          labName: e.labName,
          results: e.ExamResults.map(r => r.toPublicJSON()),
        })),
        series: Object.values(markersMap),
      },
    });
  } catch (err) { next(err); }
});

// POST /api/reports/:examTypeId/analyze
router.post('/:examTypeId/analyze', authenticate, async (req, res, next) => {
  try {
    const { examTypeId } = req.params;
    const { profileId } = req.body;

    const profile = await UserProfile.findOne({ where: { id: profileId, userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    const settings = await UserSettings.findOne({ where: { userId: req.user.id } });
    if (!settings?.aiApiKey) {
      return res.status(400).json({ success: false, error: 'API Key de IA não configurada. Configure em Ajustes.' });
    }

    const examType = await ExamType.findByPk(examTypeId);
    const exams = await BloodExam.findAll({
      where: { examTypeId, profileId, status: 'completed' },
      include: [ExamResult],
      order: [['examDate', 'ASC']],
    });

    if (exams.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum exame encontrado para análise' });
    }

    const results = exams.map(e => ({
      examDate: e.examDate,
      results: e.ExamResults.map(r => ({
        markerName: r.markerName,
        value: r.value,
        unit: r.unit,
        refMin: r.refMin,
        refMax: r.refMax,
        status: r.getStatus(),
      })),
    }));

    const adapter = getAdapter(settings);
    const analysis = await adapter.analyzeExamHistory(profile.toPublicJSON(), examType.name, results);

    console.log('Analysis:', analysis);


    res.json({ success: true, data: { analysis, generatedAt: new Date().toISOString() } });
  } catch (err) { next(err); }
});

// GET /api/reports/:examTypeId/pdf?profileId=X
router.get('/:examTypeId/pdf', authenticate, async (req, res, next) => {
  try {
    const puppeteer = require('puppeteer');
    const { examTypeId } = req.params;
    const { profileId, analysis } = req.query;

    const profile = await UserProfile.findOne({ where: { id: profileId, userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    const examType = await ExamType.findByPk(examTypeId);
    const exams = await BloodExam.findAll({
      where: { examTypeId, profileId, status: 'completed' },
      include: [ExamResult],
      order: [['examDate', 'ASC']],
    });

    const p = profile.toPublicJSON();
    const today = new Date().toLocaleDateString('pt-BR');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; }
  h1 { color: #1e3a5f; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
  h2 { color: #2563eb; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #1e3a5f; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge-normal { color: #059669; font-weight: bold; }
  .badge-high { color: #dc2626; font-weight: bold; }
  .badge-low { color: #d97706; font-weight: bold; }
  .header-info { display: flex; justify-content: space-between; background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
  .footer { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
  .analysis { background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin-top: 24px; white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>🩸 HemoTrack — Relatório de Exame</h1>
  <div class="header-info">
    <div>
      <strong>Paciente:</strong> ${p.name}<br>
      <strong>Idade:</strong> ${p.age || 'N/A'} anos &nbsp;|&nbsp; <strong>Sexo:</strong> ${p.sex || 'N/A'}<br>
      <strong>Peso:</strong> ${p.weight ? p.weight + ' kg' : 'N/A'} &nbsp;|&nbsp; <strong>Altura:</strong> ${p.height ? p.height + ' cm' : 'N/A'} &nbsp;|&nbsp; <strong>IMC:</strong> ${p.bmi || 'N/A'}
    </div>
    <div>
      <strong>Exame:</strong> ${examType?.name}<br>
      <strong>Gerado em:</strong> ${today}<br>
      <strong>Total de registros:</strong> ${exams.length}
    </div>
  </div>
  <h2>Histórico de Resultados</h2>
  <table>
    <thead><tr><th>Data</th><th>Laboratório</th>${exams[0]?.ExamResults?.map(r => `<th>${r.markerName} (${r.unit || ''})</th>`).join('') || ''}</tr></thead>
    <tbody>
      ${exams.map(exam => `
        <tr>
          <td>${new Date(exam.examDate).toLocaleDateString('pt-BR')}</td>
          <td>${exam.labName || '—'}</td>
          ${exam.ExamResults.map(r => {
      const status = r.getStatus();
      return `<td class="badge-${status}">${r.value}</td>`;
    }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${analysis ? `<h2>Análise por IA</h2><div class="analysis">${decodeURIComponent(analysis)}</div>` : ''}
  <div class="footer">
    Gerado pelo HemoTrack em ${today} &nbsp;|&nbsp; Este relatório é informativo e <strong>não substitui consulta médica profissional</strong>.
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="hemotrack-${examType?.name?.replace(/\s/g, '-')}-${today}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

module.exports = router;
