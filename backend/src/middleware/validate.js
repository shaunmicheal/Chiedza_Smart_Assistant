export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.validated = parsed;
    if (parsed.body !== undefined) req.body = parsed.body;
    // Note: req.query and req.params are getter-only in Express 5 and must not be
    // reassigned. They are already populated by the router; validated copies live
    // in req.validated for handlers that need them.
    next();
  } catch (error) {
    next(error);
  }
};
