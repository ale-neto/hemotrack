const { ExamType } = require('../models');

const SYSTEM_EXAM_TYPES = [
  {
    name: 'Hemograma Completo',
    category: 'Hematologia',
    isSystem: true,
    markers: [
      { name: 'Hemoglobina', unit: 'g/dL', refMin: 12.0, refMax: 16.0, description: 'Proteína que transporta oxigênio' },
      { name: 'Hematócrito', unit: '%', refMin: 36.0, refMax: 46.0 },
      { name: 'Leucócitos', unit: 'mil/mm³', refMin: 4.0, refMax: 11.0 },
      { name: 'Plaquetas', unit: 'mil/mm³', refMin: 150.0, refMax: 400.0 },
      { name: 'VCM', unit: 'fL', refMin: 80.0, refMax: 100.0 },
      { name: 'HCM', unit: 'pg', refMin: 27.0, refMax: 33.0 },
      { name: 'CHCM', unit: 'g/dL', refMin: 32.0, refMax: 36.0 },
      { name: 'Neutrófilos', unit: '%', refMin: 45.0, refMax: 70.0 },
      { name: 'Linfócitos', unit: '%', refMin: 20.0, refMax: 45.0 },
    ],
  },
  {
    name: 'Glicemia em Jejum',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Glicose', unit: 'mg/dL', refMin: 70.0, refMax: 99.0, description: 'Normal em jejum: 70-99 mg/dL' },
    ],
  },
  {
    name: 'Hemoglobina Glicada (HbA1c)',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'HbA1c', unit: '%', refMin: null, refMax: 5.7, description: 'Abaixo de 5.7% = normal; 5.7-6.4% = pré-diabetes' },
    ],
  },
  {
    name: 'Perfil Lipídico',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Colesterol Total', unit: 'mg/dL', refMin: null, refMax: 190.0 },
      { name: 'HDL', unit: 'mg/dL', refMin: 40.0, refMax: null, description: 'Colesterol bom — quanto maior melhor' },
      { name: 'LDL', unit: 'mg/dL', refMin: null, refMax: 130.0, description: 'Colesterol ruim' },
      { name: 'VLDL', unit: 'mg/dL', refMin: null, refMax: 30.0 },
      { name: 'Triglicerídeos', unit: 'mg/dL', refMin: null, refMax: 150.0 },
    ],
  },
  {
    name: 'Função Renal',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Creatinina', unit: 'mg/dL', refMin: 0.6, refMax: 1.2 },
      { name: 'Ureia', unit: 'mg/dL', refMin: 15.0, refMax: 45.0 },
      { name: 'Ácido Úrico', unit: 'mg/dL', refMin: 3.5, refMax: 7.2 },
    ],
  },
  {
    name: 'Função Hepática',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'TGO (AST)', unit: 'U/L', refMin: null, refMax: 40.0 },
      { name: 'TGP (ALT)', unit: 'U/L', refMin: null, refMax: 41.0 },
      { name: 'GGT', unit: 'U/L', refMin: null, refMax: 61.0 },
      { name: 'Fosfatase Alcalina', unit: 'U/L', refMin: 40.0, refMax: 150.0 },
      { name: 'Bilirrubina Total', unit: 'mg/dL', refMin: null, refMax: 1.2 },
    ],
  },
  {
    name: 'Função Tireoidiana',
    category: 'Hormônios',
    isSystem: true,
    markers: [
      { name: 'TSH', unit: 'mUI/L', refMin: 0.4, refMax: 4.0 },
      { name: 'T3 Livre', unit: 'pg/mL', refMin: 2.3, refMax: 4.2 },
      { name: 'T4 Livre', unit: 'ng/dL', refMin: 0.8, refMax: 1.8 },
    ],
  },
  {
    name: 'Vitaminas e Minerais',
    category: 'Micronutrientes',
    isSystem: true,
    markers: [
      { name: 'Vitamina D (25-OH)', unit: 'ng/mL', refMin: 30.0, refMax: 100.0 },
      { name: 'Vitamina B12', unit: 'pg/mL', refMin: 200.0, refMax: 900.0 },
      { name: 'Ferritina', unit: 'ng/mL', refMin: 15.0, refMax: 200.0 },
      { name: 'Ferro Sérico', unit: 'µg/dL', refMin: 60.0, refMax: 170.0 },
      { name: 'Magnésio', unit: 'mg/dL', refMin: 1.6, refMax: 2.6 },
    ],
  },
  {
    name: 'Proteínas',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Proteínas Totais', unit: 'g/dL', refMin: 6.0, refMax: 8.0 },
      { name: 'Albumina', unit: 'g/dL', refMin: 3.5, refMax: 5.0 },
      { name: 'Globulinas', unit: 'g/dL', refMin: 2.0, refMax: 3.5 },
    ],
  },
  {
    name: 'Urina (EAS)',
    category: 'Urinálise',
    isSystem: true,
    markers: [
      { name: 'pH', unit: '', refMin: 5.0, refMax: 8.0 },
      { name: 'Densidade', unit: '', refMin: 1005.0, refMax: 1030.0 },
      { name: 'Proteínas', unit: 'mg/dL', refMin: null, refMax: 10.0 },
      { name: 'Glicose', unit: 'mg/dL', refMin: null, refMax: 0.0 },
      { name: 'Hemácias', unit: '/campo', refMin: null, refMax: 3.0 },
      { name: 'Leucócitos', unit: '/campo', refMin: null, refMax: 5.0 },
    ],
  },
  {
    name: 'Hormônios Sexuais',
    category: 'Hormônios',
    isSystem: true,
    markers: [
      { name: 'Testosterona Total', unit: 'ng/dL', refMin: 249, refMax: 836 },
      { name: 'Testosterona Livre', unit: 'ng/dL', refMin: 3.4, refMax: 24.6 },
      { name: 'FSH', unit: 'mUI/mL', refMin: 1.4, refMax: 18.1 },
      { name: 'LH', unit: 'mUI/mL', refMin: 1.5, refMax: 9.3 },
      { name: 'Estradiol', unit: 'pg/mL', refMin: null, refMax: 43.2 },
      { name: 'Prolactina', unit: 'ng/mL', refMin: null, refMax: 15.0 },
      { name: 'SHBG', unit: 'nmol/L', refMin: 10, refMax: 57 },
      { name: 'DHEA-S', unit: 'ng/mL', refMin: 1.33, refMax: 6.48 },
      { name: 'Progesterona', unit: 'ng/mL', refMin: null, refMax: null },
    ],
  },
  {
    name: 'Marcadores Inflamatórios',
    category: 'Imunologia',
    isSystem: true,
    markers: [
      { name: 'PCR (Proteína C Reativa)', unit: 'mg/dL', refMin: null, refMax: 0.5 },
      { name: 'PCR Ultra-Sensível', unit: 'mg/dL', refMin: null, refMax: 0.1 },
      { name: 'VHS', unit: 'mm/h', refMin: null, refMax: 15 },
      { name: 'Fibrinogênio', unit: 'mg/dL', refMin: 200, refMax: 400 },
    ],
  },
  {
    name: 'Metabolismo do Ferro',
    category: 'Hematologia',
    isSystem: true,
    markers: [
      { name: 'Ferro Sérico', unit: 'µg/dL', refMin: 70, refMax: 180 },
      { name: 'Ferritina', unit: 'ng/mL', refMin: 22, refMax: 275 },
      { name: 'Capacidade de Fixação do Ferro (TIBC)', unit: 'µg/dL', refMin: 250, refMax: 425 },
      { name: 'Saturação da Transferrina', unit: '%', refMin: 20, refMax: 50 },
    ],
  },
  {
    name: 'Risco Cardiovascular',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Homocisteína', unit: 'µmol/L', refMin: 3.7, refMax: 13.9 },
      { name: 'Lipoproteína (a)', unit: 'mg/dL', refMin: null, refMax: 30 },
      { name: 'Apolipoproteína A', unit: 'mg/dL', refMin: 79, refMax: 169 },
      { name: 'Apolipoproteína B', unit: 'mg/dL', refMin: 40, refMax: 174 },
    ],
  },
  {
    name: 'Resistência à Insulina',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Insulina', unit: 'µUI/mL', refMin: 2.6, refMax: 24.9 },
      { name: 'Índice HOMA-IR', unit: '', refMin: null, refMax: 4.65 },
      { name: 'Glicose', unit: 'mg/dL', refMin: 70, refMax: 99 },
    ],
  },
  {
    name: 'Enzimas Musculares',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'CK (Creatinoquinase)', unit: 'U/L', refMin: null, refMax: 195 },
      { name: 'CK-MB', unit: 'U/L', refMin: null, refMax: 25 },
      { name: 'LDH', unit: 'U/L', refMin: 135, refMax: 225 },
      { name: 'Mioglobina', unit: 'ng/mL', refMin: null, refMax: 90 },
    ],
  },
  {
    name: 'Eletrólitos',
    category: 'Bioquímica',
    isSystem: true,
    markers: [
      { name: 'Sódio', unit: 'mEq/L', refMin: 132, refMax: 146 },
      { name: 'Potássio', unit: 'mEq/L', refMin: 3.5, refMax: 5.5 },
      { name: 'Cloreto', unit: 'mEq/L', refMin: 98, refMax: 107 },
      { name: 'Cálcio', unit: 'mg/dL', refMin: 8.5, refMax: 10.5 },
      { name: 'Fósforo', unit: 'mg/dL', refMin: 2.5, refMax: 4.5 },
      { name: 'Magnésio', unit: 'mg/dL', refMin: 1.6, refMax: 2.6 },
    ],
  },
  {
    name: 'Sorologias',
    category: 'Imunologia',
    isSystem: true,
    markers: [
      { name: 'VDRL', unit: '', refMin: null, refMax: null },
      { name: 'Anti-HIV', unit: '', refMin: null, refMax: null },
      { name: 'HBsAg (Hepatite B)', unit: '', refMin: null, refMax: null },
      { name: 'Anti-HCV (Hepatite C)', unit: '', refMin: null, refMax: null },
      { name: 'Anti-HBs', unit: '', refMin: null, refMax: null },
    ],
  },
  {
    name: 'Outros Exames',
    category: 'Geral',
    isSystem: true,
    markers: [],
  },
];

async function seed() {
  try {
    const count = await ExamType.count({ where: { isSystem: true } });
    if (count > 0) {
      console.log('Seed already executed — skipping.');
      return;
    }
    await ExamType.bulkCreate(SYSTEM_EXAM_TYPES);
    console.log(`Seed: ${SYSTEM_EXAM_TYPES.length} exam types created.`);
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

module.exports = seed;
