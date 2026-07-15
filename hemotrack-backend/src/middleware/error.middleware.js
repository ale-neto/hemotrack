function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.errors.map((e) => e.message),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, error: 'Registro já existe' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Arquivo muito grande. Máximo: 10MB' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }

  const status = err.status || 500;
  const isServerError = status >= 500;
  res.status(status).json({
    success: false,
    error: isServerError && process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
  });
}

module.exports = errorHandler;
