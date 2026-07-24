# Stanford Football Schedule

A single-screen display designed for the 1872 x 1404, 10.3-inch TRMNL X e-paper display. It requests Stanford's current regular-season football schedule directly from ESPN's public schedule API each time it renders (`team=24`, `seasontype=2`).

## Preview locally

Run `python3 -m http.server 8000` from this directory, then open `http://localhost:8000`.

For a TRMNL X portrait setup, set the custom webpage viewport to **1872 x 1404**. The layout adapts to smaller preview windows as well.
