const gamesFlag = process.env.REACT_APP_ENABLE_GAMES;

const isGamesEnabled =
  gamesFlag === "true" ||
  (gamesFlag !== "false" && process.env.NODE_ENV !== "production");

export { isGamesEnabled };
