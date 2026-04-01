import React from "react";
import FeatureBanner from "../Components/FeatureBanner";
import Header from "../Components/Header";
import "./Gamepage.css";
import Banner from "../Components/Banner";
import Gamescard from "../Components/Gamescard";
import { useState } from "react";
import { useCallback } from "react";
import GameDetailPage from "../Components/GameDetailPage";
import { useMemo } from "react";

const categories = [
  {
    id: 1,
    name: "Action",
    image:
      "https://wallpapers.com/images/hd/bgmi-holding-off-zombies-ews8jphkgngvlkhd.jpg",
  },
  {
    id: 2,
    name: "Adventure",
    image:
      "https://clan.akamai.steamstatic.com/images/11088164/fc149fcdcf38d84b9fe8d24ba0d70517353c1c5f.png",
  },
  {
    id: 3,
    name: "Casual",
    image:
      "https://cdn2.unrealengine.com/fgss04-keyart-offerimagelandscape-2560x1440-2560x1440-89c8edd4ffe307f5d760f286a28c3404-2560x1440-e9d811eebce7.jpg",
  },
  {
    id: 4,
    name: "Horror",
    image:
      "https://wallpapers.com/images/hd/bgmi-holding-off-zombies-ews8jphkgngvlkhd.jpg",
  },
];

const games = [
  {
    id: 1,
    image:
      "https://wallpapers.com/images/hd/bgmi-holding-off-zombies-ews8jphkgngvlkhd.jpg",
    title: "BGMI",
    genre: "Action",
    info: { players: "40k", year: "2021" },
    description:
      "A deadly virus is spreading across Los Angeles, turning its inhabitants into ravenous zombies.",
    developer: "Krafton",
    gameLink: "https://www.bgmi.pub/",
    screenshots: [
      "https://bsmedia.business-standard.com/_media/bs/img/article/2025-09/04/full/1756967760-3943.png?im=FeatureCrop,size=(826,465)",
      "https://4kwallpapers.com/images/walls/thumbs/7843.jpg",
      "https://images.moneycontrol.com/static-mcnews/2023/06/BGMI.jpg?impolicy=website&width=1280&height=720",
    ],
    fullStory:
      "Battlegrounds Mobile India (BGMI) is an adrenaline-pumping battle royale experience tailored specifically for the Indian gaming community. Players parachute onto a sprawling map, scavenge for weapons, gear, and resources, and engage in intense combat against 99 other players. The shrinking safe zone forces continuous confrontation, culminating in a thrilling final showdown where the last squad standing claims the coveted 'Winner Winner Chicken Dinner.' The game features multiple modes, customizable characters, and regular seasonal content updates that expand the lore and challenge the players.",
  },
  {
    id: 2,
    image:
      "https://cdn2.unrealengine.com/fgss04-keyart-offerimagelandscape-2560x1440-2560x1440-89c8edd4ffe307f5d760f286a28c3404-2560x1440-e9d811eebce7.jpg",
    title: "FALL GUYS",
    genre: "Casual",
    info: { players: "60k", year: "2023" },
    description: "You will fall for Fall Guys",
    developer: "Mediatonic",
    gameLink: "https://www.fallguys.com/",
    screenshots: [
      "https://cdn2.unrealengine.com/ccc4aa03b9f1c9a05b3237948802407d-1920x1080-18cbfe543d40.jpeg",
      "https://cdn2.unrealengine.com/cmp-10-9keyart-16x9-pg-4-3840x2160-28f8b8d2edcb.png",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTq-XNYbirrDbd8tIy0chBwxrDIrxoFkdnbuA&s",
    ],
    fullStory:
      "Fall Guys is a massive, multiplayer party game where hordes of contestants take on round after round of escalating chaos until one winner remains! Players must overcome bizarre obstacles, navigate competitive races, and master coordination challenges, all while trying to avoid hilarious elimination. The game features a vibrant, colorful aesthetic and focuses on lighthearted fun and competitive silliness.",
  },
  {
    id: 3,
    image:
      "https://clan.akamai.steamstatic.com/images/11088164/fc149fcdcf38d84b9fe8d24ba0d70517353c1c5f.png",
    title: "ELDEN RING",
    genre: "Action",
    info: { players: "100k", year: "2022" },
    description:
      "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.",
    developer: "FromSoftware",
    gameLink: "https://en.bandainamcoent.eu/elden-ring/elden-ring",
    screenshots: [
      "https://cdn.thewirecutter.com/wp-content/media/2022/03/elden-ring-2048px-0001.jpg?auto=webp&quality=75&crop=1.91:1&width=1200",
      "https://static0.srcdn.com/wordpress/wp-content/uploads/2024/05/the-tarnished-from-elden-ring-with-bosses.jpg",
      "https://www.dexerto.com/cdn-image/wp-content/uploads/2022/10/13/3fPJhbZVcWx3m5SJPrHZgQ.jpg?width=1200&quality=60&format=auto",
    ],
    fullStory:
      "The Golden Order is broken. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between. This vast world, created in collaboration with George R. R. Martin, features complex dungeons, mythical beasts, and deadly secrets waiting to be unearthed. The game offers unparalleled freedom to explore and customize your character, making every journey unique and perilous.",
  },
];

const Gamepage = () => {
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const handleGameClick = useCallback((game) => {
    setSelectedGame(game);
    window.scrollTo(0, 0);
  }, []);

  const handleBackClick = useCallback(() => {
    setSelectedGame(null);
    window.scrollTo(0, 0);
  }, []);

  const handleCategorySelect = (genre) => {
    setSearchQuery("");
    setSelectedGenre(genre);
  };
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    // When the user starts searching, clear genre filter for better results
    if (query.length > 0) {
      setSelectedGenre(null);
    }
  }, []);
  const filteredGames = useMemo(() => {
    let gamesToDisplay = games;

    // 1. Filter by Genre (only apply if there is no search query)
    if (selectedGenre && searchQuery.length === 0) {
      const lowerSelectedGenre = selectedGenre.toLowerCase();
      gamesToDisplay = gamesToDisplay.filter(
        (game) => game.genre.toLowerCase() === lowerSelectedGenre,
      );
    }
    if (searchQuery.length > 0) {
      // When searching, clear genre selection for filtering clarity
      setSelectedGenre(null);
      const lowerSearchQuery = searchQuery.toLowerCase();

      gamesToDisplay = games.filter(
        (game) =>
          // Check if search query matches game title OR game description
          game.title.toLowerCase().includes(lowerSearchQuery) ||
          game.description.toLowerCase().includes(lowerSearchQuery),
      );
    }

    return gamesToDisplay;
  }, [games, selectedGenre, searchQuery]);
  return (
    <div className="game">
      {selectedGame ? (
        <GameDetailPage
          game={selectedGame}
          onBack={handleBackClick}
          showBackButton={!!selectedGame}
        />
      ) : (
        <>
          <Header
            searchQuery={searchQuery} // Pass the state
            onSearchChange={handleSearchChange} // Pass the handler
          />
          <main className="main-content">
            {searchQuery.length === 0 && <Banner />}

            {searchQuery.length === 0 && (
              <FeatureBanner
                categories={categories}
                onCategorySelect={handleCategorySelect}
                selectedGenre={selectedGenre}
                onSearchChange={handleSearchChange}
              />
            )}
            <Gamescard
              games={filteredGames}
              selectedGenre={selectedGenre}
              onGameClick={handleGameClick}
              searchQuery={searchQuery}
            />
          </main>
        </>
      )}
    </div>
  );
};

export default Gamepage;
