import React, { useContext } from "react";
import {
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import { ThemeModeContext } from "../context/ThemeContext";

function ThemeToggle() {
  const { mode, toggleTheme } = useContext(ThemeModeContext);

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode}
      onChange={(event, nextMode) => {
        if (nextMode) {
          toggleTheme(nextMode);
        }
      }}
      sx={{
        backgroundColor: "background.paper",
        borderRadius: 999,
        p: 0.5,
        "& .MuiToggleButton-root": {
          border: 0,
          borderRadius: 999,
          px: 1.25,
        },
      }}
    >
      <Tooltip title="Light mode">
        <ToggleButton value="light">
          <LightModeRoundedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Dark mode">
        <ToggleButton value="dark">
          <DarkModeRoundedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="System">
        <ToggleButton value="system">
          <SettingsBrightnessRoundedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}

export default ThemeToggle;
