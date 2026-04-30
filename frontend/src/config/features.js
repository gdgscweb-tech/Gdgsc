const isGamesEnabled =
  process.env.REACT_APP_ENABLE_GAMES === "true" ||
  process.env.REACT_APP_ENV !== "production";

export { isGamesEnabled };
