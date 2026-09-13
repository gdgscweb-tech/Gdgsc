jest.mock("../src/models/Event", () => ({
  create: jest.fn(),
  findById: jest.fn(),
}));
jest.mock("../src/models/Registration", () => ({
  find: jest.fn(),
  deleteMany: jest.fn(),
}));
jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));

const Event = require("../src/models/Event");
const eventController = require("../src/controllers/eventController");

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  set: jest.fn(),
});

const validFields = {
  name: "Game Design Workshop",
  description: "A practical workshop for building better game ideas.",
  date: "2026-10-10T10:00",
  eventEndDate: "2026-10-10T12:00",
  registrationStartDate: "2026-09-01T10:00",
  registrationEndDate: "2026-10-09T18:00",
  location: "USAR Auditorium",
  pointsAwarded: "100",
  isActive: "true",
  customRegistrationFields: "[]",
};

describe("event admin controller validation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("accepts the multipart-shaped create payload and normalizes values", async () => {
    const created = { _id: "event-1", name: validFields.name };
    Event.create.mockResolvedValue(created);
    const req = { body: validFields, file: undefined, headers: { "content-type": "multipart/form-data" } };
    const res = makeResponse();
    const next = jest.fn();

    await eventController.createEvent(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({
      name: validFields.name,
      pointsAwarded: 100,
      isActive: true,
      customRegistrationFields: [],
      date: expect.any(Date),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test("returns a validation error instead of crashing on malformed edit fields", async () => {
    const existing = {
      ...validFields,
      _id: "event-1",
      pointsAwarded: 100,
      customRegistrationFields: [],
      save: jest.fn(),
    };
    Event.findById.mockResolvedValue(existing);
    const req = { body: { ...validFields, customRegistrationFields: "not-json" }, file: undefined, params: { id: "event-1" } };
    const res = makeResponse();
    const next = jest.fn();

    await eventController.updateEvent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      message: "customRegistrationFields must be valid JSON.",
    }));
    expect(existing.save).not.toHaveBeenCalled();
  });

  test("normalizes Google Drive share URL to /api/assets/drive/:fileId", async () => {
    const created = { _id: "event-2", name: validFields.name };
    Event.create.mockResolvedValue(created);
    const req = {
      body: {
        ...validFields,
        imageUrl: "https://drive.google.com/file/d/10XCfalLfD2J1t0WT5WVi3ik-QCcqFFf5/view?usp=drive_link",
      },
      file: undefined,
      headers: { "content-type": "application/json" },
    };
    const res = makeResponse();
    const next = jest.fn();

    await eventController.createEvent(req, res, next);

    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: "/api/assets/drive/10XCfalLfD2J1t0WT5WVi3ik-QCcqFFf5",
    }));
  });
});
