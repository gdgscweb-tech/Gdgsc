// backend/tests/recruitmentController.test.js
//
// Unit tests for the recruitment controller.
// All MongoDB calls are mocked — no live DB connection required.

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../src/models/Recruitment', () => {
  const mock = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  };
  // Also attach ALLOWED_TEAMS as the real module does
  mock.ALLOWED_TEAMS = [
    'Unreal (Game Development)',
    'Blender (Game Design)',
    'Prototype (Graphic Design, UI/UX)',
    'Scratch (Web Development)',
    'Overwatch (Event Management)',
    'Outreach (PR and Media)',
    'Catalyst (Research & Development)',
    'Theft (sponsorship)',
  ];
  return mock;
});

jest.mock('../src/models/Event', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

const Recruitment = require('../src/models/Recruitment');
const Event = require('../src/models/Event');
const ctrl = require('../src/controllers/recruitmentController');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  send: jest.fn(),
});

const baseBody = {
  eventId: 'event-id-001',
  email: 'test@example.com',
  fullName: 'Test User',
  enrollmentNumber: 'E12345',
  contactNumber: '9876543210',
  uss: 'USAR',
  year: '2024-2028',
  teams: ['Scratch (Web Development)'],
  motivation: 'I want to learn and contribute.',
  experience: 'I have built React apps before.',
  portfolioOrSocials: 'https://github.com/testuser',
};

const makeReq = (overrides = {}) => ({
  user: { id: 'user-auth-id' },
  body: overrides.body !== undefined ? overrides.body : { ...baseBody },
  params: overrides.params || {},
  query: overrides.query || {},
});

// Wraps async controller — captures both direct res.json calls AND
// errors thrown by asyncHandler (which calls next(err) in real Express).
const callCtrl = async (handler, req, res) => {
  const next = jest.fn();
  try {
    await handler(req, res, next);
  } catch (err) {
    if (!res.status.mock.calls.some((args) => args[0] >= 400)) {
      res.status(500);
    }
    res.json({ message: err.message });
    return;
  }
  if (next.mock.calls.length > 0 && next.mock.calls[0][0] instanceof Error) {
    const err = next.mock.calls[0][0];
    if (!res.status.mock.calls.some((args) => args[0] >= 400)) {
      res.status(500);
    }
    res.json({ message: err.message });
  }
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('recruitmentController', () => {
  beforeEach(() => jest.resetAllMocks());

  // -------------------------------------------------------------------------
  // GET /api/recruitments/config
  // -------------------------------------------------------------------------

  test('0a. GET /config returns event details when slug exists', async () => {
    const fakeEvent = {
      _id: 'event-id-001',
      eventId: 'EVT001',
      slug: 'gdgsc-recruitments-2026',
      name: 'GDGSC Recruitments 2026',
      description: 'Apply now.',
      date: new Date('2026-09-15'),
      eventEndDate: new Date('2026-09-30'),
      registrationStartDate: new Date('2026-09-13'),
      registrationEndDate: new Date('2026-09-28'),
      location: 'Online',
      isActive: true,
    };
    Event.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEvent) });

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.getRecruitmentConfig, req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response).toMatchObject({
      eventId: 'event-id-001',
      slug: 'gdgsc-recruitments-2026',
      name: 'GDGSC Recruitments 2026',
      isActive: true,
    });
  });

  test('0b. GET /config returns 404 when recruitment event is not seeded', async () => {
    Event.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.getRecruitmentConfig, req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not found') })
    );
  });

  // -------------------------------------------------------------------------
  // POST /api/recruitments — submit
  // -------------------------------------------------------------------------

  test('1. POST creates application with valid data (single team)', async () => {
    const fakeEvent = { _id: 'event-id-001' };
    const fakeApp = { ...baseBody, _id: 'app-001', userId: 'user-auth-id', status: 'pending' };
    Event.findById.mockResolvedValue(fakeEvent);
    Recruitment.create.mockResolvedValue(fakeApp);

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(Recruitment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-auth-id',
        teams: ['Scratch (Web Development)'],
      })
    );
  });

  test('1b. POST creates application with multiple teams', async () => {
    const fakeEvent = { _id: 'event-id-001' };
    const multiTeamBody = {
      ...baseBody,
      teams: ['Unreal (Game Development)', 'Scratch (Web Development)', 'Catalyst (Research & Development)'],
    };
    const fakeApp = { ...multiTeamBody, _id: 'app-002', userId: 'user-auth-id', status: 'pending' };
    Event.findById.mockResolvedValue(fakeEvent);
    Recruitment.create.mockResolvedValue(fakeApp);

    const req = makeReq({ body: multiTeamBody });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const createArg = Recruitment.create.mock.calls[0][0];
    // teams must be stored as an array, not a string
    expect(Array.isArray(createArg.teams)).toBe(true);
    expect(createArg.teams).toHaveLength(3);
    expect(createArg.teams).toContain('Scratch (Web Development)');
    expect(createArg.teams).toContain('Unreal (Game Development)');
  });

  test('2. POST rejects duplicate submission (code 11000)', async () => {
    const fakeEvent = { _id: 'event-id-001' };
    Event.findById.mockResolvedValue(fakeEvent);
    const dupError = new Error('Duplicate key');
    dupError.code = 11000;
    Recruitment.create.mockRejectedValue(dupError);

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('already submitted') })
    );
  });

  // Required field validation — no emailId (it was removed)
  const requiredFields = [
    'email', 'fullName', 'enrollmentNumber', 'contactNumber',
    'uss', 'year', 'motivation', 'experience', 'eventId',
  ];

  requiredFields.forEach((field, idx) => {
    test(`3.${idx + 1}. POST rejects missing required field: ${field}`, async () => {
      Event.findById.mockResolvedValue({ _id: 'event-id-001' });
      const body = { ...baseBody };
      delete body[field];
      const req = makeReq({ body });
      const res = makeRes();
      await callCtrl(ctrl.submitApplication, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining(field) })
      );
    });
  });

  test('3.E. POST confirms emailId field no longer exists / is not required', async () => {
    // If emailId is sent it should just be ignored — the submission should succeed
    const fakeEvent = { _id: 'event-id-001' };
    Event.findById.mockResolvedValue(fakeEvent);
    Recruitment.create.mockResolvedValue({ ...baseBody, _id: 'app-003', userId: 'user-auth-id' });

    const req = makeReq({ body: { ...baseBody, emailId: 'should-be-ignored@example.com' } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // emailId must NOT be passed to Recruitment.create
    const createArg = Recruitment.create.mock.calls[0][0];
    expect(createArg).not.toHaveProperty('emailId');
  });

  test('4. POST rejects invalid uss enum value', async () => {
    const fakeEvent = { _id: 'event-id-001' };
    Event.findById.mockResolvedValue(fakeEvent);
    const valError = new Error('USS must be one of: USAR, USDI, USAP, USMC');
    valError.name = 'ValidationError';
    Recruitment.create.mockRejectedValue(valError);

    const req = makeReq({ body: { ...baseBody, uss: 'INVALID_USS' } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('5. POST rejects invalid year enum value', async () => {
    const fakeEvent = { _id: 'event-id-001' };
    Event.findById.mockResolvedValue(fakeEvent);
    const valError = new Error('Year must be one of the provided batch options');
    valError.name = 'ValidationError';
    Recruitment.create.mockRejectedValue(valError);

    const req = makeReq({ body: { ...baseBody, year: '2020-2024' } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('6. POST rejects empty teams array', async () => {
    Event.findById.mockResolvedValue({ _id: 'event-id-001' });

    const req = makeReq({ body: { ...baseBody, teams: [] } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('teams') })
    );
  });

  test('6b. POST rejects missing teams field entirely', async () => {
    Event.findById.mockResolvedValue({ _id: 'event-id-001' });
    const body = { ...baseBody };
    delete body.teams;

    const req = makeReq({ body });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('teams') })
    );
  });

  test('7. POST rejects invalid team name in teams array', async () => {
    Event.findById.mockResolvedValue({ _id: 'event-id-001' });

    const req = makeReq({ body: { ...baseBody, teams: ['Nonexistent Team', 'Scratch (Web Development)'] } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid team') })
    );
  });

  test('8. POST stores teams as an array (not a comma-separated string)', async () => {
    const teams = ['Unreal (Game Development)', 'Blender (Game Design)'];
    const fakeEvent = { _id: 'event-id-001' };
    Event.findById.mockResolvedValue(fakeEvent);
    Recruitment.create.mockResolvedValue({ ...baseBody, teams, _id: 'app-004' });

    const req = makeReq({ body: { ...baseBody, teams } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const createArg = Recruitment.create.mock.calls[0][0];
    expect(Array.isArray(createArg.teams)).toBe(true);
    expect(typeof createArg.teams).not.toBe('string');
    expect(createArg.teams).toEqual(teams);
  });

  test('9. POST does NOT use client-provided userId — always uses req.user.id', async () => {
    const fakeEvent = { _id: 'event-id-001' };
    Event.findById.mockResolvedValue(fakeEvent);
    Recruitment.create.mockResolvedValue({ _id: 'app-005', userId: 'user-auth-id' });

    const req = makeReq({ body: { ...baseBody, userId: 'malicious-user-id' } });
    const res = makeRes();
    await callCtrl(ctrl.submitApplication, req, res);

    const callArg = Recruitment.create.mock.calls[0][0];
    expect(callArg.userId).toBe('user-auth-id');
  });

  // -------------------------------------------------------------------------
  // GET /api/recruitments/me
  // -------------------------------------------------------------------------

  test('10. GET /me returns 404 if no application exists', async () => {
    Recruitment.findOne.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.getMyApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('No application') })
    );
  });

  test('11. GET /me returns existing application with teams array', async () => {
    const fakeApp = {
      _id: 'app-001',
      userId: 'user-auth-id',
      fullName: 'Test User',
      teams: ['Unreal (Game Development)', 'Scratch (Web Development)'],
      status: 'pending',
    };
    Recruitment.findOne.mockResolvedValue(fakeApp);

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.getMyApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseApp = res.json.mock.calls[0][0];
    expect(Array.isArray(responseApp.teams)).toBe(true);
    expect(responseApp.teams).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // PUT /api/recruitments/me
  // -------------------------------------------------------------------------

  test('12. PUT /me updates teams and preserves existing multiple-team selections', async () => {
    const fakeApp = {
      _id: 'app-001',
      userId: 'user-auth-id',
      status: 'pending',
      teams: ['Scratch (Web Development)'],
      email: 'old@example.com',
      fullName: 'Old Name',
      save: jest.fn().mockResolvedValue(true),
    };
    Recruitment.findOne.mockResolvedValue(fakeApp);

    const newTeams = ['Unreal (Game Development)', 'Catalyst (Research & Development)'];
    const req = makeReq({
      body: { teams: newTeams, fullName: 'Updated Name' },
    });
    const res = makeRes();
    await callCtrl(ctrl.updateMyApplication, req, res);

    expect(fakeApp.teams).toEqual(newTeams);
    expect(fakeApp.fullName).toBe('Updated Name');
    expect(fakeApp.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('13. PUT /me returns 403 if application is not pending', async () => {
    const fakeApp = {
      _id: 'app-001',
      userId: 'user-auth-id',
      status: 'shortlisted',
      save: jest.fn(),
    };
    Recruitment.findOne.mockResolvedValue(fakeApp);

    const req = makeReq({ body: { fullName: 'New Name' } });
    const res = makeRes();
    await callCtrl(ctrl.updateMyApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('14. PUT /me rejects update with empty teams array', async () => {
    const fakeApp = {
      _id: 'app-001',
      status: 'pending',
      teams: ['Scratch (Web Development)'],
      save: jest.fn(),
    };
    Recruitment.findOne.mockResolvedValue(fakeApp);

    const req = makeReq({ body: { teams: [] } });
    const res = makeRes();
    await callCtrl(ctrl.updateMyApplication, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('team') })
    );
  });

  test('15. PUT /me does not allow changing userId or eventId', async () => {
    const fakeApp = {
      _id: 'app-001',
      userId: 'user-auth-id',
      eventId: 'event-id-001',
      status: 'pending',
      teams: ['Scratch (Web Development)'],
      save: jest.fn().mockResolvedValue(true),
    };
    Recruitment.findOne.mockResolvedValue(fakeApp);

    const req = makeReq({
      body: { userId: 'hacker-id', eventId: 'fake-event', email: 'updated@example.com' },
    });
    const res = makeRes();
    await callCtrl(ctrl.updateMyApplication, req, res);

    expect(fakeApp.userId).toBe('user-auth-id');
    expect(fakeApp.eventId).toBe('event-id-001');
  });

  // -------------------------------------------------------------------------
  // GET /api/recruitments (Admin)
  // -------------------------------------------------------------------------

  test('16. GET / returns all applications', async () => {
    const fakeApps = [
      { _id: 'app-1', fullName: 'Alice', teams: ['Unreal (Game Development)'], status: 'pending' },
      { _id: 'app-2', fullName: 'Bob', teams: ['Scratch (Web Development)', 'Outreach (PR and Media)'], status: 'shortlisted' },
    ];
    Recruitment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeApps) });

    const req = makeReq();
    const res = makeRes();
    await callCtrl(ctrl.getAllApplications, req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const apps = res.json.mock.calls[0][0];
    expect(apps).toHaveLength(2);
    expect(Array.isArray(apps[1].teams)).toBe(true);
    expect(apps[1].teams).toHaveLength(2);
  });

  test('17. GET / supports ?search= filtering (searches teams array)', async () => {
    const fakeApps = [
      { _id: 'app-1', fullName: 'Alice', teams: ['Unreal (Game Development)'] },
    ];
    Recruitment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeApps) });

    const req = makeReq({ query: { search: 'Alice' } });
    const res = makeRes();
    await callCtrl(ctrl.getAllApplications, req, res);

    const filterArg = Recruitment.find.mock.calls[0][0];
    // Search filter must include a clause that matches teams array entries
    const hasSearch =
      filterArg.$or !== undefined ||
      (filterArg.$and && filterArg.$and.some((clause) => clause.$or));
    expect(hasSearch).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('18. GET / supports ?status= filter', async () => {
    const fakeApps = [{ _id: 'app-1', status: 'shortlisted', teams: ['Unreal (Game Development)'] }];
    Recruitment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeApps) });

    const req = makeReq({ query: { status: 'shortlisted' } });
    const res = makeRes();
    await callCtrl(ctrl.getAllApplications, req, res);

    const filterArg = Recruitment.find.mock.calls[0][0];
    expect(filterArg.status).toBe('shortlisted');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // -------------------------------------------------------------------------
  // PUT /api/recruitments/:id/status (Admin)
  // -------------------------------------------------------------------------

  test('19. PUT /:id/status updates status to valid value', async () => {
    const fakeApp = {
      _id: 'app-001',
      status: 'pending',
      teams: ['Scratch (Web Development)'],
      save: jest.fn().mockResolvedValue(true),
    };
    Recruitment.findById.mockResolvedValue(fakeApp);

    const req = makeReq({ params: { id: 'app-001' }, body: { status: 'shortlisted' } });
    const res = makeRes();
    await callCtrl(ctrl.updateApplicationStatus, req, res);

    expect(fakeApp.status).toBe('shortlisted');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('20. PUT /:id/status rejects invalid status values', async () => {
    const req = makeReq({ params: { id: 'app-001' }, body: { status: 'approved' } });
    const res = makeRes();
    await callCtrl(ctrl.updateApplicationStatus, req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Status must be one of') })
    );
  });

  // -------------------------------------------------------------------------
  // GET /api/recruitments/export/csv (Admin)
  // -------------------------------------------------------------------------

  test('21. GET /export/csv returns correct headers and no emailId column', async () => {
    const fakeApps = [
      {
        _id: 'app-001',
        email: 'alice@example.com',
        fullName: 'Alice Smith',
        enrollmentNumber: 'E001',
        contactNumber: '9876543210',
        uss: 'USAR',
        year: '2024-2028',
        yearOther: '',
        teams: ['Unreal (Game Development)', 'Scratch (Web Development)'],
        motivation: 'To grow.',
        experience: 'React dev.',
        portfolioOrSocials: 'https://github.com/alice',
        status: 'pending',
        createdAt: new Date('2026-09-14T00:00:00Z'),
      },
    ];
    Recruitment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeApps) });

    const req = makeReq({ query: {} });
    const res = makeRes();
    await callCtrl(ctrl.exportCsv, req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="gdgsc-recruitments-2026.csv"'
    );

    const csvText = res.send.mock.calls[0][0];

    // Email column present
    expect(csvText).toContain('Email');
    // E-mail ID column must NOT exist
    expect(csvText).not.toContain('E-mail ID');
    // Team(s) header present
    expect(csvText).toContain('Team(s)');
    // Teams are joined as comma-separated in the CSV row
    expect(csvText).toContain('Unreal (Game Development)');
    expect(csvText).toContain('Scratch (Web Development)');
    // alice's email is present
    expect(csvText).toContain('alice@example.com');
  });

  test('22. CSV correctly joins multiple teams in a single column (quoted)', async () => {
    const fakeApps = [
      {
        _id: 'app-002',
        email: 'bob@example.com',
        fullName: 'Bob Jones',
        enrollmentNumber: 'E002',
        contactNumber: '1234567890',
        uss: 'USDI',
        year: '2025-2029',
        yearOther: '',
        teams: ['Unreal (Game Development)', 'Scratch (Web Development)', 'Catalyst (Research & Development)'],
        motivation: 'Passion.',
        experience: 'Python dev.',
        portfolioOrSocials: '',
        status: 'pending',
        createdAt: new Date('2026-09-14T00:00:00Z'),
      },
    ];
    Recruitment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeApps) });

    const req = makeReq({ query: {} });
    const res = makeRes();
    await callCtrl(ctrl.exportCsv, req, res);

    const csvText = res.send.mock.calls[0][0];
    const lines = csvText.split('\n');
    const dataLine = lines[1]; // second line is first data row

    // Multiple teams joined and quoted because the joined string contains commas
    expect(dataLine).toContain('"Unreal (Game Development), Scratch (Web Development), Catalyst (Research & Development)"');
  });
});
