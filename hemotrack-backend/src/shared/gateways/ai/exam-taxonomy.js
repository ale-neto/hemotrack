const PDF_EXTRACTION_PROMPT = `Você é um especialista em análise de exames laboratoriais brasileiros.
Analise o PDF e retorne APENAS um JSON válido, sem markdown, sem explicações.

TIPOS DE EXAME RECONHECIDOS (use EXATAMENTE esses nomes quando aplicável):
- Hemograma Completo
- Glicemia em Jejum
- Hemoglobina Glicada (HbA1c)
- Perfil Lipídico
- Função Renal
- Função Hepática
- Função Tireoidiana
- Vitaminas e Minerais
- Proteínas
- Urina (EAS)
- Hormônios Sexuais
- Marcadores Inflamatórios
- Metabolismo do Ferro
- Risco Cardiovascular
- Resistência à Insulina
- Enzimas Musculares
- Eletrólitos
- Sorologias
- Outros Exames

REGRAS DE AGRUPAMENTO:
- Hemograma, eritrograma, leucograma, plaquetas → "Hemograma Completo"
- Colesterol Total, HDL, LDL, VLDL, triglicerídeos, lipídeos totais, lipidograma → "Perfil Lipídico"
- TSH, T3, T4, T3 livre, T4 livre, tiroxina → "Função Tireoidiana"
- Creatinina, ureia, taxa de filtração glomerular → "Função Renal"
- TGO, TGP, AST, ALT, GGT, gama-glutamil, fosfatase alcalina, bilirrubinas, transaminase → "Função Hepática"
- Vitamina D, 25-hidroxivitamina, B12, ácido fólico, ferritina, ferro sérico, magnésio → "Vitaminas e Minerais"
- Testosterona, FSH, LH, estradiol, prolactina, SHBG, DHEA, progesterona, hormônio luteinizante, folículo estimulante → "Hormônios Sexuais"
- PCR, proteína C reativa, VHS, hemossedimentação, fibrinogênio → "Marcadores Inflamatórios"
- Ferro sérico, ferritina, TIBC, saturação da transferrina, capacidade de fixação → "Metabolismo do Ferro"
- Homocisteína, apolipoproteína A, apolipoproteína B, lipoproteína(a), LPA → "Risco Cardiovascular"
- Insulina, HOMA-IR, índice de homa, resistência insulínica → "Resistência à Insulina"
- CK, CK-MB, LDH, mioglobina, CPK, creatino fosfoquinase, creatina quinase → "Enzimas Musculares"
- Sódio, potássio, cloreto, cálcio, fósforo, eletrólitos → "Eletrólitos"
- VDRL, HIV, hepatite B, hepatite C, HBsAg, Anti-HCV, anti-HVC, sorologia → "Sorologias"
- Glicose isolada, glicemia → "Glicemia em Jejum"
- Qualquer marcador que não se encaixe nas categorias acima → "Outros Exames"

REGRAS GERAIS:
- Um PDF pode conter múltiplos tipos — separe cada um em um objeto do array
- value deve ser sempre um número (nunca string, nunca null) — se não tiver valor numérico, omita o marcador
- Retorne SOMENTE o JSON array.

Formato:
[
  {
    "exam_type": "nome exato da lista acima",
    "exam_date": "YYYY-MM-DD ou null",
    "lab_name": "nome do laboratório ou null",
    "results": [
      {
        "marker": "nome do marcador",
        "value": número,
        "unit": "unidade ou null",
        "ref_min": número ou null,
        "ref_max": número ou null
      }
    ]
  }
]`;

// Mapeamento de normalização: variações possíveis → nome canônico do sistema
const EXAM_TYPE_ALIASES = {
  // Hemograma
  'hemograma': 'Hemograma Completo',
  'hemograma completo': 'Hemograma Completo',
  'eritrograma': 'Hemograma Completo',
  'leucograma': 'Hemograma Completo',
  'hemograma com contagem de plaquetas': 'Hemograma Completo',
  'contagem de células sanguíneas': 'Hemograma Completo',
  'cbc': 'Hemograma Completo',

  // Glicemia
  'glicemia': 'Glicemia em Jejum',
  'glicemia em jejum': 'Glicemia em Jejum',
  'glicose em jejum': 'Glicemia em Jejum',
  'dosagem de glicose': 'Glicemia em Jejum',
  'dosagem de glicose em jejum': 'Glicemia em Jejum',
  'glicose': 'Glicemia em Jejum',

  // HbA1c
  'hemoglobina glicada': 'Hemoglobina Glicada (HbA1c)',
  'hemoglobina glicada (hba1c)': 'Hemoglobina Glicada (HbA1c)',
  'hba1c': 'Hemoglobina Glicada (HbA1c)',
  'hb a1c': 'Hemoglobina Glicada (HbA1c)',
  'glicohemoglobina': 'Hemoglobina Glicada (HbA1c)',

  // Perfil Lipídico
  'perfil lipídico': 'Perfil Lipídico',
  'perfil lipidico': 'Perfil Lipídico',
  'lipidograma': 'Perfil Lipídico',
  'lipidograma(col,fra,tri,lip)': 'Perfil Lipídico',
  'colesterol': 'Perfil Lipídico',
  'colesterol total': 'Perfil Lipídico',
  'triglicerídeos': 'Perfil Lipídico',
  'triglicerides': 'Perfil Lipídico',

  // Função Renal
  'função renal': 'Função Renal',
  'funcao renal': 'Função Renal',
  'ureia e creatinina': 'Função Renal',
  'creatinina': 'Função Renal',
  'dosagem de creatinina': 'Função Renal',
  'dosagem de uréia': 'Função Renal',
  'uréia': 'Função Renal',

  // Função Hepática
  'função hepática': 'Função Hepática',
  'funcao hepatica': 'Função Hepática',
  'enzimas hepáticas': 'Função Hepática',
  'transaminases': 'Função Hepática',
  'tgo': 'Função Hepática',
  'tgp': 'Função Hepática',
  'tgo-transaminase': 'Função Hepática',
  'tgp-transaminase': 'Função Hepática',
  'transaminase oxalacética': 'Função Hepática',
  'transaminase pirúvica': 'Função Hepática',
  'gama glutamil transferase': 'Função Hepática',
  'gama-glutamil transferase': 'Função Hepática',
  'fosfatase alcalina': 'Função Hepática',

  // Função Tireoidiana
  'função tireoidiana': 'Função Tireoidiana',
  'funcao tireoidiana': 'Função Tireoidiana',
  'tireoide': 'Função Tireoidiana',
  'tsh': 'Função Tireoidiana',
  'dosagem de tsh': 'Função Tireoidiana',
  't4 livre': 'Função Tireoidiana',
  'dosagem de t4 livre': 'Função Tireoidiana',
  't3': 'Função Tireoidiana',
  't4': 'Função Tireoidiana',
  't3-total-triiodotironina': 'Função Tireoidiana',
  't4 livre-tiroxina livre': 'Função Tireoidiana',

  // Vitaminas e Minerais
  'vitaminas e minerais': 'Vitaminas e Minerais',
  'vitamina d': 'Vitaminas e Minerais',
  '25-hidroxivitamina d': 'Vitaminas e Minerais',
  'vitamina b12': 'Vitaminas e Minerais',
  'ácido fólico': 'Vitaminas e Minerais',
  'acido folico': 'Vitaminas e Minerais',
  'ferritina': 'Vitaminas e Minerais',
  'ferritina sérica': 'Vitaminas e Minerais',
  'magnésio': 'Vitaminas e Minerais',
  'dosagem de magnésio': 'Vitaminas e Minerais',

  // Hormônios Sexuais
  'hormônios sexuais': 'Hormônios Sexuais',
  'hormonios sexuais': 'Hormônios Sexuais',
  'testosterona': 'Hormônios Sexuais',
  'testosterona total': 'Hormônios Sexuais',
  'testosterona livre': 'Hormônios Sexuais',
  'fsh': 'Hormônios Sexuais',
  'lh': 'Hormônios Sexuais',
  'estradiol': 'Hormônios Sexuais',
  'dhea': 'Hormônios Sexuais',
  'dhea-s': 'Hormônios Sexuais',
  'dhea - dehidroepiandrosterona': 'Hormônios Sexuais',
  'shbg': 'Hormônios Sexuais',
  'shbg - glob. lig. dos hor. sexuais': 'Hormônios Sexuais',

  // Marcadores Inflamatórios
  'marcadores inflamatórios': 'Marcadores Inflamatórios',
  'marcadores inflamatorios': 'Marcadores Inflamatórios',
  'proteína c reativa': 'Marcadores Inflamatórios',
  'proteína "c" reativa': 'Marcadores Inflamatórios',
  'pcr': 'Marcadores Inflamatórios',
  'pcr ultra-sensível': 'Marcadores Inflamatórios',
  'vhs': 'Marcadores Inflamatórios',
  'hemossedimentação': 'Marcadores Inflamatórios',
  'hemossedimentação (vhs)': 'Marcadores Inflamatórios',
  'fibrinogênio': 'Marcadores Inflamatórios',
  'dosagem de fibrinogênio': 'Marcadores Inflamatórios',

  // Metabolismo do Ferro
  'metabolismo do ferro': 'Metabolismo do Ferro',
  'ferro sérico': 'Metabolismo do Ferro',
  'determinação do ferro sérico': 'Metabolismo do Ferro',
  'ferro serico': 'Metabolismo do Ferro',
  'índice de sat. da transferrina': 'Metabolismo do Ferro',
  'saturação da transferrina': 'Metabolismo do Ferro',
  'tibc': 'Metabolismo do Ferro',

  // Risco Cardiovascular
  'risco cardiovascular': 'Risco Cardiovascular',
  'homocisteína': 'Risco Cardiovascular',
  'homocisteina': 'Risco Cardiovascular',
  'apolipoproteína a': 'Risco Cardiovascular',
  'apolipoproteína b': 'Risco Cardiovascular',
  'apolipoproteina a': 'Risco Cardiovascular',
  'apolipoproteina b': 'Risco Cardiovascular',
  'pcr (ultra-sensivel)': 'Risco Cardiovascular',

  // Resistência à Insulina
  'resistência à insulina': 'Resistência à Insulina',
  'resistencia a insulina': 'Resistência à Insulina',
  'insulina': 'Resistência à Insulina',
  'índice de homa - ir': 'Resistência à Insulina',
  'homa-ir': 'Resistência à Insulina',
  'homa ir': 'Resistência à Insulina',

  // Enzimas Musculares
  'enzimas musculares': 'Enzimas Musculares',
  'ck': 'Enzimas Musculares',
  'cpk': 'Enzimas Musculares',
  'creatino fosfoquinase': 'Enzimas Musculares',
  'creatina - fosfoquinase (ck)': 'Enzimas Musculares',
  'dosagem de cpk': 'Enzimas Musculares',
  'creatinoquinase': 'Enzimas Musculares',
  'dehidrotestosterona': 'Hormônios Sexuais', // DHT vai para hormônios
  'dht': 'Hormônios Sexuais',

  // Eletrólitos
  'eletrólitos': 'Eletrólitos',
  'eletrolitos': 'Eletrólitos',
  'sódio': 'Eletrólitos',
  'dosagem de sódio': 'Eletrólitos',
  'potássio': 'Eletrólitos',
  'dosagem de potássio': 'Eletrólitos',

  // Sorologias
  'sorologias': 'Sorologias',
  'vdrl': 'Sorologias',
  'hiv': 'Sorologias',
  'hepatite': 'Sorologias',
  'anti-hvc': 'Sorologias',
  'anti-hbs': 'Sorologias',
  'hbsag': 'Sorologias',
  'pesquisa de hiv': 'Sorologias',
};

/**
 * Normaliza o nome do tipo de exame retornado pela IA
 * para o nome canônico cadastrado no sistema.
 */
function normalizeExamType(rawName) {
  if (!rawName) return 'Outros Exames';

  // Tenta match exato sem acento
  const keyNoAccent = rawName.toLowerCase().trim();
  if (EXAM_TYPE_ALIASES[keyNoAccent]) return EXAM_TYPE_ALIASES[keyNoAccent];

  // Tenta match com chave normalizada
  const normalized = rawName.toLowerCase().trim()
    .replace(/[áàãâä]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i').replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c');

  if (EXAM_TYPE_ALIASES[normalized]) return EXAM_TYPE_ALIASES[normalized];

  // Tenta match parcial (contém)
  for (const [alias, canonical] of Object.entries(EXAM_TYPE_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return canonical;
    }
  }

  return rawName; // retorna o nome original se não encontrar alias
}

/** Garante que a extração de PDF sempre retorne um array de exames, mesmo se a IA retornar um único objeto. */
function normalizeExtractedExams(parsed) {
  const exams = Array.isArray(parsed) ? parsed : [parsed];
  return exams.map((exam) => ({ ...exam, exam_type: normalizeExamType(exam.exam_type) }));
}

function buildAnalysisPrompt(profile, examType, results) {
  const bmi = profile.weight && profile.height
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
    : 'não informado';

  const age = profile.birthDate
    ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear()
    : 'não informado';

  return `Você é um assistente de saúde que analisa exames laboratoriais.
Forneça uma análise informativa em português. Lembre sempre que não substitui consulta médica.

PERFIL DO PACIENTE:
- Nome: ${profile.name}
- Idade: ${age} anos
- Sexo: ${profile.sex || 'não informado'}
- Peso: ${profile.weight ? profile.weight + ' kg' : 'não informado'}
- Altura: ${profile.height ? profile.height + ' cm' : 'não informado'}
- IMC: ${bmi}
- Doenças pré-existentes: ${profile.diseases?.join(', ') || 'nenhuma informada'}
- Medicamentos em uso: ${profile.medications?.join(', ') || 'nenhum informado'}

TIPO DE EXAME: ${examType}

HISTÓRICO DE RESULTADOS (ordenado por data):
${results.map(r => `
Data: ${r.examDate}
${r.results.map(m => `  ${m.markerName}: ${m.value} ${m.unit || ''} (ref: ${m.refMin || '?'} - ${m.refMax || '?'}) → ${m.status}`).join('\n')}`).join('\n---')}

Forneça uma análise com:
1. Avaliação geral dos resultados
2. Marcadores que merecem atenção (altos, baixos ou tendência preocupante)
3. Tendências observadas ao longo do tempo
4. Sugestões gerais de acompanhamento
5. Lembrete de que é apenas informativo e não substitui consulta médica`;
}

module.exports = {
  PDF_EXTRACTION_PROMPT,
  EXAM_TYPE_ALIASES,
  normalizeExamType,
  normalizeExtractedExams,
  buildAnalysisPrompt,
};
