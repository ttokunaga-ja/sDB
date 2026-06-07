import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "media",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#0E6F6A",
          contrastText: "#FFFFFF",
        },
        secondary: {
          main: "#B33A3A",
          contrastText: "#FFFFFF",
        },
        background: {
          default: "#FAFAF8",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#1F2428",
          secondary: "#5B646B",
        },
        divider: "#D9DDD9",
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#64C7BD",
          contrastText: "#10201D",
        },
        secondary: {
          main: "#F08A8A",
          contrastText: "#2B1010",
        },
        background: {
          default: "#000000",
          paper: "#0B0B0B",
        },
        text: {
          primary: "#F5F5F5",
          secondary: "#C2C2C2",
        },
        divider: "rgba(255, 255, 255, 0.14)",
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      '"Inter", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: "clamp(3rem, 8vw, 6rem)",
      lineHeight: 0.96,
      letterSpacing: 0,
      fontWeight: 800,
    },
    h2: {
      fontSize: "2.25rem",
      lineHeight: 1.12,
      letterSpacing: 0,
      fontWeight: 760,
    },
    h3: {
      fontSize: "1.5rem",
      lineHeight: 1.2,
      letterSpacing: 0,
      fontWeight: 720,
    },
    h4: {
      fontSize: "1.18rem",
      lineHeight: 1.3,
      letterSpacing: 0,
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      letterSpacing: 0,
      fontWeight: 700,
    },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&:focus-visible, &.Mui-focusVisible": {
            outline: "3px solid var(--mui-palette-secondary-main)",
            outlineOffset: 2,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 44,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
