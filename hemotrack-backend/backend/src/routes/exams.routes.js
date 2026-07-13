router.get('/with-exams', authenticate, async (req, res, next) => {
  try {
    const { profileId } = req.query;

    // Busca os profileIds que pertencem ao usuário
    const profileWhere = { userId: req.user.id };
    if (profileId) profileWhere.id = profileId;

    const userProfiles = await UserProfile.findAll({
      where: profileWhere,
      attributes: ['id'],
    });

    const profileIds = userProfiles.map(p => p.id);

    if (profileIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const examTypes = await ExamType.findAll({
      include: [{
        model: BloodExam,
        required: true,
        where: {
          status: 'completed',
          profileId: profileIds,
        },
        attributes: [],
      }],
      attributes: ['id', 'name', 'category'],
      group: ['ExamType.id'],
    });

    res.json({ success: true, data: examTypes });
  } catch (err) { next(err); }
});