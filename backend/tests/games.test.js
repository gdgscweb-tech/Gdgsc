// backend/tests/games.test.js

const Game = require("../src/models/Game");
const GameAsset = require("../src/models/GameAsset");
const gameService = require("../src/services/gameService");

describe("GameService & Game Model Unit Tests", () => {
  let mockStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService = {
      deleteObject: jest.fn().mockResolvedValue(true),
    };
  });

  test("creates a game with auto-generated slug", async () => {
    const gameData = {
      title: "Chrono Drift 2026",
      description: "Time bending cyber racing game",
      genre: "Racing",
      developer: "GDGSC Guild",
      image: "https://cdn.example.com/cover.webp",
      videos: ["https://cdn.example.com/trailer.mp4"],
    };

    const createdDoc = {
      _id: "66d000000000000000000001",
      ...gameData,
      name: gameData.title,
      slug: "chrono-drift-2026",
      isActive: true,
      isFeatured: false,
    };

    jest.spyOn(Game, "create").mockResolvedValueOnce(createdDoc);

    const result = await gameService.createGame(gameData);
    expect(result.title).toBe("Chrono Drift 2026");
    expect(result.slug).toBe("chrono-drift-2026");
    expect(Game.create).toHaveBeenCalledWith(
      expect.objectContaining({
        videos: ["https://cdn.example.com/trailer.mp4"],
      }),
    );
    expect(Game.create).toHaveBeenCalledTimes(1);
  });

  test("throws validation error if required fields are missing on game creation", async () => {
    await expect(
      gameService.createGame({ title: "Incomplete" }),
    ).rejects.toThrow("title, description, genre, and developer are required");
  });

  test("finds game by ID or slug", async () => {
    const mockGame = {
      _id: "66d000000000000000000002",
      title: "Orb of Valor",
      slug: "orb-of-valor",
    };

    jest.spyOn(Game, "findById").mockResolvedValueOnce(mockGame);
    const byId = await gameService.findGameByIdOrSlug(
      "66d000000000000000000002",
    );
    expect(byId).toEqual(mockGame);

    jest.spyOn(Game, "findById").mockReturnValueOnce(null);
    jest.spyOn(Game, "findOne").mockResolvedValueOnce(mockGame);
    const bySlug = await gameService.findGameByIdOrSlug("orb-of-valor");
    expect(bySlug).toEqual(mockGame);
  });

  test("updates game metadata safely", async () => {
    const mockGame = {
      _id: "66d000000000000000000003",
      title: "Old Title",
      description: "Old Desc",
      videos: [],
      save: jest.fn().mockResolvedValue(true),
    };

    jest
      .spyOn(gameService, "findGameByIdOrSlug")
      .mockResolvedValueOnce(mockGame);

    const updated = await gameService.updateGame("66d000000000000000000003", {
      title: "New Title",
      description: "New Description",
      videos: ["/api/games/assets/Game/trailer.webm"],
    });

    expect(updated.title).toBe("New Title");
    expect(updated.description).toBe("New Description");
    expect(updated.videos).toEqual(["/api/games/assets/Game/trailer.webm"]);
    expect(mockGame.save).toHaveBeenCalledTimes(1);
  });

  test("deletes game and cascades asset deletion to storage", async () => {
    const mockGame = {
      _id: "66d000000000000000000004",
      title: "Game To Delete",
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    const mockAssets = [
      { storageKey: "games/game-to-delete/files/v1.0.0/build.zip" },
      { storageKey: "games/game-to-delete/images/banner.webp" },
    ];

    jest
      .spyOn(gameService, "findGameByIdOrSlug")
      .mockResolvedValueOnce(mockGame);
    jest.spyOn(GameAsset, "find").mockResolvedValueOnce(mockAssets);
    jest
      .spyOn(GameAsset, "deleteMany")
      .mockResolvedValueOnce({ deletedCount: 2 });

    const result = await gameService.deleteGame(
      "66d000000000000000000004",
      mockStorageService,
    );

    expect(mockStorageService.deleteObject).toHaveBeenCalledTimes(2);
    expect(GameAsset.deleteMany).toHaveBeenCalledWith({
      game: "66d000000000000000000004",
    });
    expect(mockGame.deleteOne).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("removed successfully");
  });
});
