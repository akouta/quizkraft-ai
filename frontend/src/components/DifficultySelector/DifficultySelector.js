import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const DifficultySelector = ({ difficulty, setDifficulty }) => {
  const handleChange = (event) => {
    setDifficulty(event.target.value);
  };

  return (
    <FormControl fullWidth sx={{ marginTop: 2 }}>
      <InputLabel id="difficulty-label">Difficulty Level</InputLabel>
      <Select
        labelId="difficulty-label"
        value={difficulty}
        onChange={handleChange}
        label="Difficulty Level"
      >
        <MenuItem value="easy">Easy</MenuItem>
        <MenuItem value="medium">Medium</MenuItem>
        <MenuItem value="hard">Hard</MenuItem>
      </Select>
    </FormControl>
  );
};

export default DifficultySelector;
