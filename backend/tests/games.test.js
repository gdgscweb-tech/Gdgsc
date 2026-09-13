jest.mock('../src/services/storage/storageFactory', () => ({ getDefaultStorageService: jest.fn(), resetStorageService: jest.fn() }));
const Game = require('../src/models/Game');
const GameAsset = require('../src/models/GameAsset');
const service = require('../src/services/gameService');
const data = require('../src/services/gameDataService');
const controllers = require('../src/controllers/gamesController');
const factory = require('../src/services/storage/storageFactory');
jest.setTimeout(20000);
const id = '66d000000000000000000001';
const aid = 'aaa000000000000000000001';
const bid = 'aaa000000000000000000002';
const url = id => '/api/assets/' + id + '/content';
let record, storage, assets;
const clone = value => JSON.parse(JSON.stringify(value));
function document(value) {
  const doc = clone(value);
  doc.toObject = () => clone(value);
  doc.validate = jest.fn().mockResolvedValue();
  doc.save = jest.fn(async () => { record = clone(doc); });
  return doc;
}
function query(value) { return { sort() { return this; }, skip() { return this; }, limit: async () => value, select: async () => value }; }
const matches = (game, filter) => (!('isActive' in filter) || game.isActive === filter.isActive) && (!filter.isDisabled || !game.isDisabled);
beforeEach(() => {
  jest.restoreAllMocks();
  record = { _id: id, title: 'Game', slug: 'game', description: 'Description', genre: 'Action', developer: 'Guild',
    image: 'https://example.com/cover.png', screenshots: [], videos: [], platforms: [], isActive: false, isDisabled: false, gameFolder: id };
  assets = new Map();
  storage = { writeGameData: jest.fn().mockResolvedValue({ fileId: 'json', storageKey: 'games/' + id + '/gameData.json' }),
    objectExists: jest.fn().mockResolvedValue(true), assertInRoot: jest.fn().mockResolvedValue(true), deleteObject: jest.fn() };
  jest.spyOn(factory, 'getDefaultStorageService').mockReturnValue(storage);
  // Services capture the factory export; inject the same fake via its cached singleton factory.
  factory.resetStorageService();
  jest.spyOn(service, 'findGameByIdOrSlug').mockImplementation(async () => record ? document(record) : null);
  jest.spyOn(Game, 'findOne').mockResolvedValue(null);
  jest.spyOn(Game, 'findOneAndUpdate').mockImplementation(async (_filter, update) => {
    if (record.managementLock) return null;
    record.managementLock = update.$set.managementLock;
    return document(record);
  });
  jest.spyOn(Game, 'updateOne').mockImplementation(async (_filter, update) => {
    Object.assign(record, update.$set || {}); if (update.$unset) delete record.managementLock;
  });
  jest.spyOn(GameAsset, 'updateOne').mockResolvedValue({matchedCount:1});
  jest.spyOn(GameAsset, 'findById').mockImplementation(async id => assets.get(String(id)) || null);
  jest.spyOn(Game, 'find').mockImplementation(filter => query(matches(record, filter) ? [clone(record)] : []));
  jest.spyOn(Game, 'countDocuments').mockImplementation(async filter => matches(record, filter) ? 1 : 0);
});
afterEach(() => jest.restoreAllMocks());
// Exercise the real mutation service, supplying only mocked external persistence/storage.
const mutate = fn => service.mutate(id, fn, storage);
const publish = () => mutate(game => { game.isActive = true; });
const unpublish = () => mutate(game => { game.isActive = false; });
const json = () => JSON.parse(storage.writeGameData.mock.calls.at(-1)[0].content);

test.each([false, true])('admin lists inactive games including disabled=%s', async disabled => {
  record.isDisabled = disabled;
  expect((await service.getGames({ isActive: null })).games).toHaveLength(1);
  expect(Game.find).toHaveBeenCalledWith({});
});
test.each([false, true])('inactive games remain editable, disabled=%s', async disabled => {
  record.isDisabled = disabled;
  await mutate(game => { game.description = 'Edited'; });
  expect(record.description).toBe('Edited'); expect(json().description).toBe('Edited');
});
test('publish validates, writes JSON and exposes public listing; unpublish preserves references', async () => {
  const asset = { _id: aid, game: id, category: 'build', status: 'ready', metadata: { driveFileId: 'build' }, storageKey: 'build' };
  assets.set(aid, asset); record.gameLink = url(aid) + '?download=true'; record.gameFile = 'game.zip';
  await publish();
  expect(json().isActive).toBe(true); expect(json().gameFile).toBe('game.zip');
  expect((await service.getGames({})).games).toHaveLength(1);
  await unpublish();
  expect((await service.getGames({})).games).toHaveLength(0);
  expect(json().isActive).toBe(false); expect(record.gameLink).toContain(aid);
  expect(asset.status).toBe('ready'); expect(storage.deleteObject).not.toHaveBeenCalled();
  await mutate(game => { game.title = 'Still editable'; }); expect(record.title).toBe('Still editable');
});
test.each(['title','slug','description','genre','developer','image'])('publish rejects missing %s', async field => {
  record[field] = ''; await expect(publish()).rejects.toMatchObject({ code: 'NOT_PUBLISHABLE' });
  expect(record.isActive).toBe(false); expect(storage.writeGameData).not.toHaveBeenCalled();
});
test('showcase game needs no build, banner, platform, gallery or release year', async () => { await publish(); expect(record.isActive).toBe(true); });
test('disabled game cannot become live', async () => { record.isDisabled = true; await publish(); expect(record.isActive).toBe(false); });
test('wrong category, missing and foreign game references cannot publish', async () => {
  record.image = url(aid); assets.set(aid, { _id: aid, game: 'other', category: 'thumbnail', status: 'ready' });
  await expect(publish()).rejects.toMatchObject({ code: 'NOT_PUBLISHABLE' });
});
test('Drive mirror failure preserves a valid Mongo edit and exposes pending sync', async () => {
  storage.writeGameData.mockRejectedValueOnce(new Error('Drive unavailable'));
  await mutate(game => { game.title = 'Candidate'; });
  expect(record.title).toBe('Candidate'); expect(record.gameDataSync.status).toBe('pending');
  expect(record.gameDataSync.message).toContain('Drive unavailable'); expect(record.managementLock).toBeUndefined();
});
test('mirror outage does not invent a public runtime dependency', async () => {
  record.isActive = true; storage.writeGameData.mockRejectedValue(new Error('Drive down'));
  await mutate(game => { game.title = 'Candidate'; });
  expect(record.isActive).toBe(true); expect(record.title).toBe('Candidate'); expect(record.gameDataSync.status).toBe('pending');
});
test('database failure compensates remote JSON', async () => {
  Game.findOneAndUpdate.mockImplementation(async () => { const d = document(record); d.save.mockRejectedValue(new Error('DB write failed')); return d; });
  await expect(mutate(game => { game.title = 'Candidate'; })).rejects.toThrow('DB write failed'); expect(json().title).toBe('Game');
});
test('simultaneous mutation rejected before remote write', async () => {
  record.managementLock = 'other'; await expect(publish()).rejects.toMatchObject({ code: 'GAME_BUSY' }); expect(storage.writeGameData).not.toHaveBeenCalled();
});
test('metadata, gallery order, videos and build changes generate compatible deterministic JSON', async () => {
  record.screenshots = ['https://example.com/2.png','https://example.com/1.png'];
  record.videos = ['https://example.com/2.mp4','https://example.com/1.mp4'];
  await mutate(game => { game.gameLink = 'https://example.com/new.zip'; game.gameFile = 'new.zip'; });
  expect(json().screenshots).toEqual(record.screenshots); expect(json().videos).toEqual(record.videos);
  expect(json().gameFile).toBe('new.zip'); expect(data.serialize(record)).toBe(data.serialize(record));
  expect(json()).not.toHaveProperty('managementLock'); expect(json()).not.toHaveProperty('gameDataSync');
  const legacy = require('../src/games/Flappy/gameData.json');
  expect(Object.keys(json()).sort()).toEqual(Object.keys(legacy).sort());
});
test('inactive JSON omits unsafe references while Mongo keeps them editable', async () => {
  record.image = '/api/assets/drive/foreign'; storage.assertInRoot.mockRejectedValue(new Error('Wrong root'));
  await unpublish(); expect(json().image).toBe(''); expect(record.image).toContain('foreign');
});
test('public detail rejects inactive game', async () => {
  await expect(controllers.getGameById({params:{id},query:{}},{}, e => {throw e;})).rejects.toMatchObject({statusCode:404});
});
test('generic metadata endpoint refuses unvalidated publication fields', async () => {
  await expect(service.updateGame(id,{isActive:true})).rejects.toMatchObject({code:'EXPLICIT_PUBLISH_REQUIRED'});
});

test('explicit publish and disable/enable actions preserve separate states', async () => {
  await service.setPublication(id,'publish'); expect(record.isActive).toBe(true);
  await service.setPublication(id,'disable'); expect(record.isDisabled).toBe(true); expect(record.isActive).toBe(false);
  await expect(service.setPublication(id,'publish')).rejects.toMatchObject({code:'GAME_DISABLED'});
  await service.setPublication(id,'enable'); expect(record.isDisabled).toBe(false); expect(record.isActive).toBe(false);
});
test('create starts unpublished and synchronizes JSON', async () => {
  jest.spyOn(Game,'create').mockImplementation(async values => { record = {...record,...values}; return record; });
  await service.createGame({title:'Created',description:'Description',genre:'Action',developer:'Guild'});
  expect(record.isActive).toBe(false); expect(json().title).toBe('Created');
});
test('metadata update service uses synchronization and preserves array replacement', async () => {
  await service.updateGame(id,{description:'Changed',screenshots:['https://example.com/new.png']});
  expect(json().description).toBe('Changed'); expect(json().screenshots).toEqual(['https://example.com/new.png']);
});
test.each(['screenshot','trailer'])('reorders complete %s collection and JSON', async category => {
  const field=category==='screenshot'?'screenshots':'videos'; record[field]=[url(aid),url(bid)];
  for(const assetId of [aid,bid])assets.set(assetId,{_id:assetId,game:id,category,status:'ready',visibility:'public',storageKey:assetId,metadata:{driveFileId:assetId}});
  const res={status:jest.fn().mockReturnThis(),json:jest.fn()};
  await controllers.reorderGameAssets({params:{id},body:{category,order:[bid,aid]},query:{}},res,e=>{throw e;});
  expect(record[field]).toEqual([url(bid),url(aid)]); expect(json()[field]).toEqual(record[field]);
});
test.each([[aid,aid],[aid],['cccccccccccccccccccccccc']])('rejects incomplete, duplicate or missing reorder %j', async order => {
  record.screenshots=[url(aid),url(bid)];
  for(const assetId of [aid,bid])assets.set(assetId,{_id:assetId,game:id,category:'screenshot',status:'ready'});
  await expect(controllers.reorderGameAssets({params:{id},body:{category:'screenshot',order},query:{}},{},e=>{throw e;})).rejects.toMatchObject({statusCode:400});
});
test('delete writes inactive JSON and detaches database assets without deleting Drive files', async () => {
  jest.spyOn(GameAsset,'updateMany').mockResolvedValue({modifiedCount:1});
  Game.findOneAndUpdate.mockImplementation(async () => { const doc=document(record);doc.deleteOne=jest.fn(async()=>{});return doc; });
  await service.deleteGame(id,storage);
  expect(json().isActive).toBe(false); expect(storage.deleteObject).not.toHaveBeenCalled();
  expect(GameAsset.updateMany).toHaveBeenCalledWith({game:id},{$set:{status:'deleted'}});
});
test('upload reference replacement preserves gallery position and selects builds', async () => {
  const AssetService=require('../src/services/assetService'); const assetService=new AssetService(storage);
  record.screenshots=[url(aid),'https://example.com/other.png'];
  const old={_id:aid,game:id,category:'screenshot',status:'ready'};assets.set(aid,old);
  const replacement={_id:bid,game:id,category:'screenshot',status:'ready',visibility:'public',storageKey:'new',metadata:{driveFileId:'new',replacesAssetId:aid},save:jest.fn()};assets.set(bid,replacement);
  await assetService.syncGameReference(replacement);
  expect(record.screenshots).toEqual([url(bid),'https://example.com/other.png']);expect(old.status).toBe('ready');
  replacement.category='build';replacement.originalFilename='new.zip';replacement.metadata.replacesAssetId=undefined;
  await assetService.syncGameReference(replacement);expect(record.gameFile).toBe('new.zip');expect(json().gameLink).toContain(bid);
});
test('failed replacement preserves previous gallery', async () => {
  const AssetService=require('../src/services/assetService');const assetService=new AssetService(storage);
  record.screenshots=[url(aid)];assets.set(aid,{_id:aid,game:id,category:'screenshot',status:'ready'});
  const replacement={_id:bid,game:id,category:'screenshot',status:'ready',metadata:{replacesAssetId:aid},save:jest.fn()};
  Game.findOneAndUpdate.mockImplementation(async () => { const doc=document(record);doc.save.mockRejectedValue(new Error('Database failed'));return doc; });
  await expect(assetService.syncGameReference(replacement)).rejects.toThrow('Database failed');expect(record.screenshots).toEqual([url(aid)]);
});
test('authorization blocks anonymous and ordinary users from publishing', async () => {
  process.env.JWT_SECRET='unit-test-only-secret';
  const express=require('express'),request=require('supertest'),jwt=require('jsonwebtoken');
  const app=express();app.use(express.json());app.use('/api/games',require('../src/routes/gamesRoutes'));app.use(require('../src/middleware/errorHandler'));
  let res=await request(app).post('/api/games/'+id+'/publication').send({action:'publish'});expect(res.status).toBe(401);
  jest.spyOn(require('../src/models/User'),'findById').mockReturnValue({select:async()=>({_id:id,role:'user'})});
  res=await request(app).post('/api/games/'+id+'/publication').set('Authorization','Bearer '+jwt.sign({id},process.env.JWT_SECRET)).send({action:'publish'});
  expect(res.status).toBe(403);expect(storage.writeGameData).not.toHaveBeenCalled();
});

test('HTTP publish to generated JSON to public detail and build to unpublish chain', async () => {
  process.env.JWT_SECRET='unit-test-only-secret';
  const express=require('express'),request=require('supertest'),jwt=require('jsonwebtoken');
  const User=require('../src/models/User');
  jest.spyOn(User,'findById').mockReturnValue({select:async()=>({_id:id,role:'admin'})});
  const app=express();app.use(express.json());app.use('/api/games',require('../src/routes/gamesRoutes'));app.use('/api/assets',require('../src/routes/assetRoutes'));app.use(require('../src/middleware/errorHandler'));
  const auth=req=>req.set('Authorization','Bearer '+jwt.sign({id},process.env.JWT_SECRET));
  const build={_id:aid,game:id,category:'build',status:'ready',visibility:'private',originalFilename:'game.zip',storageKey:'build',metadata:{driveFileId:'build-file'}};
  record.gameLink=url(aid)+'?download=true';record.gameFile='game.zip';
  assets.set(aid,build);
  GameAsset.findById.mockImplementation(assetId=>({then:resolve=>resolve(assets.get(assetId)),populate:async()=>({...assets.get(assetId),game:clone(record)})}));
  jest.spyOn(GameAsset,'find').mockReturnValue({select:async()=>[]});
  storage.getFileStream=jest.fn(async()=>({status:200,headers:{'content-type':'application/zip','content-length':'4'},data:require('stream').Readable.from(Buffer.from('ZIP!'))}));
  // Controller singleton was constructed during the earlier auth test; use its captured fake service storage.
  const assetController=require('../src/controllers/assetController');
  const AssetService=require('../src/services/assetService');
  const originalGet=AssetService.prototype.getDownloadUrl;
  jest.spyOn(AssetService.prototype,'getDownloadUrl').mockImplementation(function(args){return originalGet.call(new AssetService(storage),args);});
  jest.spyOn(AssetService.prototype,'getDriveFileStream').mockImplementation(args=>storage.getFileStream(args));
  let res=await auth(request(app).post('/api/games/'+id+'/publication')).send({action:'publish'});expect(res.status).toBe(200);expect(json().isActive).toBe(true);
  res=await request(app).get('/api/games/'+id);expect(res.status).toBe(200);expect(res.body.gameLink).toContain(aid);
  res=await request(app).get('/api/assets/'+aid+'/content?download=true');expect(res.status).toBe(200);expect(res.headers['content-disposition']).toContain('game.zip');
  res=await auth(request(app).post('/api/games/'+id+'/publication')).send({action:'unpublish'});expect(res.status).toBe(200);expect(json().isActive).toBe(false);
  res=await request(app).get('/api/assets/'+aid+'/content?download=true');expect(res.status).toBe(404);
  res=await request(app).get('/api/games/'+id);expect(res.status).toBe(404);
  res=await auth(request(app).get('/api/games/admin/'+id));expect(res.status).toBe(200);expect(res.body.data.gameFile).toBe('game.zip');
});

async function manualSetup({category='build',replacesAssetId}={}) {
  const AssetService=require('../src/services/assetService'); const svc=new AssetService(storage);
  storage.folderId='dev-root-123456';storage.storageEnvironment='development';storage.storageRootVariable='DEV_STORAGE_ROOT_FOLDER_ID';storage.clientEmail='service@example.test';
  let file;
  storage.getDriveFileDetails=jest.fn(async fileId => fileId===storage.folderId ? {id:fileId,name:'Development Root',mimeType:'application/vnd.google-apps.folder'} : file);
  jest.spyOn(svc,'resolveGame').mockImplementation(async()=>document(record));
  jest.spyOn(GameAsset,'create').mockImplementation(async values=>{const asset={_id:aid,...values,save:jest.fn(async()=>{})};assets.set(aid,asset);return asset;});
  jest.spyOn(GameAsset,'findOne').mockImplementation(async filter => [...assets.values()].find(a=> {
    if(filter['metadata.driveFileId'] && a.metadata?.driveFileId!==filter['metadata.driveFileId'])return false;
    if(filter.game && String(a.game)!==String(filter.game))return false;
    if(filter.category && a.category!==filter.category)return false;
    if(filter.version && a.version!==filter.version)return false;
    if(filter.status && a.status!==filter.status)return false;
    if(filter._id?.$ne && String(a._id)===String(filter._id.$ne))return false;
    if(filter._id?.$nin?.map(String).includes(String(a._id)))return false;
    return true;
  }) || null);
  const plan=await svc.prepareManualUpload({gameId:id,category,filename:category==='build'?'My Build.zip':'image.png',version:'v1.0.0',replacesAssetId,user:{_id:id}});
  file={id:'drive-file-123456',name:plan.expectedFilename,mimeType:category==='build'?'application/zip':'image/png',size:'22',parents:[storage.folderId],capabilities:{canDownload:true},md5Checksum:'checksum'};
  return {svc,plan,file,register:()=>svc.registerManualUpload({gameId:id,assetId:plan.assetId,driveFileId:file.id,user:{_id:id},filename:'untrusted.exe',size:999})};
}
test('manual instructions reflect the actual flat root, key generator and immutable game identity', async()=>{
 const {plan}=await manualSetup();expect(plan.rootVariable).toBe('DEV_STORAGE_ROOT_FOLDER_ID');expect(plan.physicalFolder).toBe('Development Root/');expect(plan.subfolder).toContain('none');
 expect(plan.logicalStorageKey).toContain('/'+id+'/files/v1.0.0/');expect(plan.expectedFilename).toMatch(/^[a-f0-9]{8}-my-build.zip$/);
 expect(plan.type).toBe('file');expect(plan.category).toBe('build');expect(plan.applicationVisibility).toBe('private');expect(assets.get(aid).status).toBe('pending');
});
test('manual registration trusts Drive metadata and connects GameAsset, Game, JSON and build URL',async()=>{
 const {file,register}=await manualSetup();const result=await register();const asset=result.asset;
 expect(asset.status).toBe('ready');expect(asset.originalFilename).toBe(file.name);expect(asset.fileSize).toBe(22);expect(asset.mimeType).toBe('application/zip');expect(asset.metadata.driveFileId).toBe(file.id);
 expect(record.gameLink).toBe(url(aid)+'?download=true');expect(json().gameLink).toBe(record.gameLink);expect(result.gameDataSync.status).toBe('synced');expect(storage.deleteObject).not.toHaveBeenCalled();
});
test('manual registration remains usable when only legacy JSON creation lacks quota',async()=>{
 const {register}=await manualSetup();storage.writeGameData.mockRejectedValue(new Error('storageQuotaExceeded'));
 const result=await register();expect(result.asset.status).toBe('ready');expect(record.gameLink).toContain(aid);expect(result.gameDataSync.status).toBe('pending');
});
test.each([
 ['wrong root',f=>{f.parents=['production-root'];},'WRONG_DRIVE_ROOT'],
 ['wrong filename',f=>{f.name='other-game.zip';},'WRONG_FILENAME'],
 ['wrong MIME',f=>{f.mimeType='image/png';},'INVALID_MIME_TYPE'],
 ['trashed file',f=>{f.trashed=true;},'DRIVE_FILE_TRASHED'],
 ['download denied',f=>{f.capabilities.canDownload=false;},'DRIVE_DOWNLOAD_DENIED'],
 ['empty file',f=>{f.size='0';},'EMPTY_DRIVE_FILE'],
 ['game path mismatch',f=>{f.properties={gameId:'other'};},'GAME_PATH_MISMATCH'],
])('manual registration rejects %s before readiness',async(_name,change,code)=>{
 const {file,register}=await manualSetup();change(file);await expect(register()).rejects.toMatchObject({code});expect(assets.get(aid).status).toBe('pending');expect(record.gameLink).toBeUndefined();
});
test('manual duplicate registration returns a useful conflict',async()=>{
 const {register}=await manualSetup();await register();await expect(register()).rejects.toMatchObject({code:'ALREADY_REGISTERED'});
});
test('file registered to another asset cannot be claimed',async()=>{
 const {file,register}=await manualSetup();assets.set(bid,{_id:bid,game:'other',metadata:{driveFileId:file.id},status:'ready'});
 await expect(register()).rejects.toMatchObject({code:'DRIVE_FILE_ALREADY_REGISTERED'});expect(record.gameLink).toBeUndefined();
});
test('concurrent duplicate version is rejected at registration',async()=>{
 const {register}=await manualSetup();assets.set(bid,{_id:bid,game:id,category:'build',version:'v1.0.0',status:'ready'});
 await expect(register()).rejects.toMatchObject({code:'VERSION_CONFLICT'});
});
test('replacement keeps old file and updates current build',async()=>{
 assets.set(bid,{_id:bid,game:id,category:'build',version:'v1.0.0',status:'ready'});
 const {register}=await manualSetup({replacesAssetId:bid});await register();expect(record.gameLink).toContain(aid);
 expect(GameAsset.updateOne).toHaveBeenCalledWith({ _id:bid,game:id },{$set:{status:'deleted','metadata.replacedBy':aid}});expect(storage.deleteObject).not.toHaveBeenCalled();
});
test('manual presentation registration updates thumbnail',async()=>{const {register}=await manualSetup({category:'thumbnail'});await register();expect(record.image).toBe(url(aid));});
test('manual registration does not cross environment even when a plan is reused',async()=>{const {register}=await manualSetup();storage.storageEnvironment='production';await expect(register()).rejects.toMatchObject({code:'WRONG_ENVIRONMENT'});});
test('manual metadata access failures preserve current references',async()=>{const {register}=await manualSetup();storage.getDriveFileDetails.mockRejectedValue(new (require('../src/utils/apiResponse').ApiError)(403,'DRIVE_FILE_INACCESSIBLE','File inaccessible'));await expect(register()).rejects.toMatchObject({code:'DRIVE_FILE_INACCESSIBLE'});expect(record.gameLink).toBeUndefined();});
test('invalid version is rejected without silently sanitizing a path',async()=>{const {svc}=await manualSetup();await expect(svc.prepareManualUpload({gameId:id,filename:'game.zip',category:'build',version:'../../v1',user:{_id:id}})).rejects.toMatchObject({code:'INVALID_VERSION'});});
test('manual plan game mismatch is rejected',async()=>{const {register}=await manualSetup();assets.get(aid).game='different';await expect(register()).rejects.toMatchObject({code:'MANUAL_PLAN_MISMATCH'});});
test('manual registration database failure marks candidate failed and preserves game',async()=>{const {register}=await manualSetup();Game.findOneAndUpdate.mockImplementation(async()=>{const doc=document(record);doc.save.mockRejectedValue(new Error('db fail'));return doc;});await expect(register()).rejects.toThrow('db fail');expect(record.gameLink).toBeUndefined();expect(assets.get(aid).status).toBe('failed');});
