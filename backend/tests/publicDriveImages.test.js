jest.mock('../src/services/assetService', () => jest.fn().mockImplementation(() => ({})));
const Game = require('../src/models/Game');
const GameAsset = require('../src/models/GameAsset');
const Event = require('../src/models/Event');
const { proxyDriveFile } = require('../src/controllers/assetController');
const ids = require('../src/config/teamDriveFileIds.json');

describe('Public Drive image authorization', () => {
  beforeEach(() => {
    jest.spyOn(GameAsset, 'findOne').mockResolvedValue(null);
    jest.spyOn(Game, 'find').mockResolvedValue([]);
    jest.spyOn(Event, 'exists').mockResolvedValue(null);
  });
  afterEach(() => jest.restoreAllMocks());
  async function request(id) {
    const req = { params: { fileId: id }, query: {}, headers: { 'if-none-match': `W/"drive-${id}"` } };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), end: jest.fn(), send: jest.fn() };
    const next = jest.fn();
    await proxyDriveFile(req, res, next);
    return { res, next };
  }
  test('team images work without frontend source files at runtime', async () => {
    const {res,next} = await request(ids[0]);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(304);
  });
  test('registered event posters pass the image access check', async () => {
    Event.exists.mockResolvedValue({_id: 'event'});
    const {res,next} = await request('event-image-id');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(304);
    const query = Event.exists.mock.calls[0][0];
    expect('/api/assets/drive/event-image-id?cache=event').toMatch(new RegExp(query.imageUrl.$regex));
    expect('/api/assets/drive/event-image-id-other').not.toMatch(new RegExp(query.imageUrl.$regex));
  });
  test('unknown files remain denied', async () => {
    const {next} = await request('unregistered-id');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({message:'File is not an application asset'}));
  });
  test('backend team IDs match the generated frontend manifest', () => {
    const manifest = require('fs').readFileSync(require('path').resolve(__dirname,'../../frontend/src/data/teamAssetManifest.js'),'utf8');
    const expected = [...new Set([...manifest.matchAll(/\/api\/assets\/drive\/([\w-]+)\?cache=team/g)].map(m=>m[1]))].sort();
    expect(ids).toEqual(expected);
  });
});
