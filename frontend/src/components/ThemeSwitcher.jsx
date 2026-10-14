import { useState } from "react";
import { BookOpen, Moon, Leaf } from "lucide-react";
import "./ThemeSwitcher.css";

const themes = [
  {
    id: "paper",
    label: "Paper & Ink",
    icon: BookOpen
  },
  {
    id: "midnight",
    label: "Midnight Scholar",
    icon: Moon
  },
  {
    id: "forest",
    label: "Forest Library",
    icon: Leaf
  }
];

function ThemeSwitcher({ compact = false }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("pkb-theme");

    return themes.some((item) => item.id === savedTheme)
      ? savedTheme
      : "paper";
  });

  const selectTheme = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem("pkb-theme", selectedTheme);

    document.documentElement.dataset.theme = selectedTheme;

    window.dispatchEvent(new Event("pkb-theme-change"));
  };

  return (
    <div
      className={`theme-switcher ${compact ? "theme-switcher-compact" : ""}`}
      role="group"
      aria-label="Choose appearance theme"
    >
      {themes.map((item) => {
        const Icon = item.icon;
        const active = theme === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`theme-switcher-button ${
              active ? "active" : ""
            }`}
            onClick={() => selectTheme(item.id)}
            title={item.label}
            aria-label={`Switch to ${item.label} theme`}
            aria-pressed={active}
          >
            <Icon size={18} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;