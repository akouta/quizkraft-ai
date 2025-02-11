import React from 'react';
import Button from '@mui/material/Button';

function AppButton({ children, onClick, variant = "contained", color = "primary", ...props }) {
  return (
    <Button variant={variant} color={color} onClick={onClick} {...props}>
      {children}
    </Button>
  );
}

export default AppButton;

