import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";

const truncate = (text, maxLength = 25) => {
  if (!text || typeof text !== "string") return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

/**
 * Reusable, responsive, accessible Breadcrumbs component.
 *
 * @param {Object} props
 * @param {Array<{label: string, to?: string}>} props.items - Array of breadcrumb items
 */
const Breadcrumbs = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <Box component="nav" aria-label="Breadcrumb" sx={{ py: 1, mb: 2 }}>
      <Box
        component="ol"
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          listStyle: "none",
          p: 0,
          m: 0,
          gap: 0.75,
          fontSize: "0.875rem",
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const displayLabel = truncate(item.label, isLast ? 35 : 22);

          return (
            <Box
              component="li"
              key={index}
              sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
            >
              {index > 0 && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.disabled"
                  sx={{ userSelect: "none", fontWeight: 700 }}
                >
                  /
                </Typography>
              )}

              {isLast || !item.to ? (
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={700}
                  color="text.primary"
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                  sx={{
                    maxWidth: { xs: 140, sm: 260, md: 400 },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayLabel}
                </Typography>
              ) : (
                <Typography
                  component={Link}
                  to={item.to}
                  variant="body2"
                  fontWeight={500}
                  color="text.secondary"
                  title={item.label}
                  sx={{
                    textDecoration: "none",
                    maxWidth: { xs: 100, sm: 180 },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s",
                    "&:hover": {
                      color: "primary.main",
                      textDecoration: "underline",
                    },
                  }}
                >
                  {displayLabel}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default Breadcrumbs;
