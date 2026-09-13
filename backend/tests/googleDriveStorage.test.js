const Storage = require('../src/services/storage/GoogleDriveStorageService');
const { getStorageRootConfig } = require('../src/config/storageConfig');
let storage, http;
beforeEach(() => {
  http = { request: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), get: jest.fn() };
  storage = new Storage({ folderId: 'dev-root', httpClient: http, clientEmail: '', privateKey: '', clientId: '', clientSecret: '', refreshToken: '' });
  jest.spyOn(storage, 'getAccessToken').mockResolvedValue('token');
});
afterEach(() => jest.restoreAllMocks());
test('uploads never simulate success when authentication fails', async () => {
  storage.getAccessToken.mockResolvedValue(null);
  await expect(storage.uploadFile({key:'games/test.zip',filePath:'unused',contentType:'application/zip'})).rejects.toThrow('upload session failed');
});
test('resumable session uses only configured root and records logical key', async () => {
  http.post.mockResolvedValue({ headers: {location:'https://upload.example/session'} });
  expect(await storage.createUploadUrl({key:'games/id/images/test.png',contentType:'image/png'})).toBe('https://upload.example/session');
  expect(http.post.mock.calls[0][1]).toMatchObject({parents:['dev-root'],properties:{storageKey:'games/id/images/test.png'}});
});
test('Drive rejected session propagates failure', async () => {
  http.post.mockRejectedValue(new Error('quota exceeded'));
  await expect(storage.createUploadUrl({key:'x',contentType:'image/png'})).rejects.toThrow('upload session failed');
});
test.each(['createMultipartUpload','signPart','completeMultipartUpload','abortMultipartUpload'])('%s rejects unsupported S3 multipart semantics', async method => {
  await expect(storage[method]({})).rejects.toThrow('use backend upload-file');
});
test('root ancestry accepts nested development file', async () => {
  http.request.mockResolvedValueOnce({data:{id:'file',parents:['folder']}}).mockResolvedValueOnce({data:{id:'folder',parents:['dev-root']}});
  await expect(storage.assertInRoot('file')).resolves.toBe(true);
});
test('production asset cannot be mutated using development root', async () => {
  http.request.mockResolvedValueOnce({data:{id:'file',parents:['prod-root']}}).mockResolvedValueOnce({data:{id:'prod-root',parents:[]}});
  await expect(storage.deleteObject({key:'file',fileId:'file'})).rejects.toThrow('outside');
  expect(http.request.mock.calls.every(([call]) => call.method === 'get')).toBe(true);
});
test('missing token is an error for metadata, never fake metadata', async () => {
  storage.getAccessToken.mockResolvedValue(null);
  await expect(storage.getObjectMetadata({key:'file'})).rejects.toThrow('authentication');
});
test.each(['development','production'])('%s JSON generation stays under its configured root', async environment => {
  const saved = {...process.env};
  try {
    process.env.NODE_ENV = environment; process.env.DEV_STORAGE_ROOT_FOLDER_ID = 'dev-root'; process.env.PROD_STORAGE_ROOT_FOLDER_ID = 'prod-root';
    storage = new Storage({httpClient:http}); jest.spyOn(storage,'getAccessToken').mockResolvedValue('token');
    const expected = environment === 'development' ? 'dev-root' : 'prod-root';
    jest.spyOn(storage,'ensureFolder').mockResolvedValueOnce({id:'games'}).mockResolvedValueOnce({id:'game-folder'});
    jest.spyOn(storage,'listChildren').mockResolvedValue([{id:'json-id',name:'gameData.json',properties:{gameId:'game-id'}}]);
    http.patch.mockResolvedValue({data:{id:'json-id'}});
    const result = await storage.writeGameData({gameId:'game-id',folderName:'Legacy Game',content:'{"isActive":true}'});
    expect(storage.ensureFolder).toHaveBeenNthCalledWith(1,expected,'games');
    expect(result.storageKey).toBe('games/Legacy Game/gameData.json');
    expect(http.patch.mock.calls[0][0]).toContain('/json-id');
  } finally { process.env = saved; }
});
test('identical environment roots fail closed', () => {
  const saved={...process.env};
  try { process.env.NODE_ENV='development'; process.env.DEV_STORAGE_ROOT_FOLDER_ID='same'; process.env.PROD_STORAGE_ROOT_FOLDER_ID='same'; expect(getStorageRootConfig).toThrow('distinct'); }
  finally {process.env=saved;}
});
test('new JSON content and metadata are uploaded atomically in one multipart request', async () => {
  jest.spyOn(storage,'ensureFolder').mockResolvedValueOnce({id:'games'}).mockResolvedValueOnce({id:'folder'});
  jest.spyOn(storage,'listChildren').mockResolvedValue([]); http.post.mockResolvedValue({data:{id:'json'}});
  await storage.writeGameData({gameId:'id',folderName:'id',content:'{"isActive":false}'});
  expect(http.post).toHaveBeenCalledTimes(1); expect(http.post.mock.calls[0][1]).toContain('"isActive":false');
  expect(http.post.mock.calls[0][1]).toContain('"parents":["folder"]');
});
test('duplicate JSON filenames are rejected instead of updating an arbitrary file', async () => {
  jest.spyOn(storage,'ensureFolder').mockResolvedValue({id:'folder'});
  jest.spyOn(storage,'listChildren').mockResolvedValue([{id:'a',name:'gameData.json'},{id:'b',name:'gameData.json'}]);
  await expect(storage.writeGameData({gameId:'id',folderName:'id',content:'{}'})).rejects.toThrow('Multiple'); expect(http.patch).not.toHaveBeenCalled();
});

test('invalid Drive ID returns a clear error without a network call',async()=>{await expect(storage.getDriveFileDetails('https://drive.google.com/invalid')).rejects.toMatchObject({code:'INVALID_DRIVE_FILE_ID'});expect(http.request).not.toHaveBeenCalled();});
test.each([[403,'DRIVE_FILE_INACCESSIBLE'],[404,'DRIVE_FILE_UNAVAILABLE']])('Drive metadata HTTP %s becomes useful registration error',async(status,code)=>{http.request.mockRejectedValue({response:{status}});await expect(storage.getDriveFileDetails('file-id-123456789')).rejects.toMatchObject({code});});
