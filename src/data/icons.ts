// Inner SVG markup (24x24 viewBox, stroke icons) for the trip-fact tiles on tour pages.
export const factIcons: Record<string, string> = {
  "pin": "<path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\" /> <circle cx=\"12\" cy=\"10\" r=\"3\" />",
  "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1\" />",
  "mountain": "<path d=\"M3 19l6-10 4 6 2-3 6 7H3z\" />",
  "bag": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"11\" rx=\"2\" /> <path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\" />",
  "meal": "<path d=\"M4 11h16M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 11v7h16v-7\" />",
  "truck": "<rect x=\"2\" y=\"9\" width=\"15\" height=\"8\" rx=\"1.5\" /> <path d=\"M17 11h3l2 3v3h-5\" /> <circle cx=\"6.5\" cy=\"18.5\" r=\"1.5\" /> <circle cx=\"16.5\" cy=\"18.5\" r=\"1.5\" />",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\" /> <path d=\"M12 7v5l3 3\" />",
  "difficulty": "<path d=\"M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z\" /> <path d=\"M9 12l2 2 4-4\" />"
};

export const factIconKeys = Object.keys(factIcons);
