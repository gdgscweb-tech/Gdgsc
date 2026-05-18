import React from "react";
import "./Header.css";
import { Search } from "lucide-react";

const Header = ({ searchQuery, onSearchChange }) => {
  return (
    <div className="search-bar">
      <Search size={18} />
      <input
        type="text"
        placeholder="Search for games"
        value={searchQuery} // Controlled input
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
};

export default Header;
