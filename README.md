# Font Awesome Picker (vanilla Web Component)

This repository contains a small vanilla JavaScript web component, `font-awesome-picker`, that lets you search Font Awesome icons and copy an icon's name to the clipboard. It uses the Font Awesome free CSS and DaisyUI for quick styling via CDN links.

Files added
- `src/font-awesome-picker.js` - the web component implementation
- `index.html` - a simple demo page that loads the component

Usage
1. Open `index.html` in a browser (no build step required).
2. Type an icon name in the search box (e.g. `coffee`, `camera`, `user`).
3. Up to 5 matches will appear in a grid. Click an item to copy its icon name (e.g., `coffee`) to the clipboard.

Notes
- The component fetches Font Awesome metadata from the unpkg CDN to discover available icon names. That request must be allowed by your network for searching to work.
- The demo uses the Font Awesome free CSS from CDN and DaisyUI compiled CSS from jsDelivr. If you prefer to bundle these assets locally or use a different version, update the links in `index.html`.

Customization ideas
- Increase `this._maxResults` in `src/font-awesome-picker.js` to show more icons.
- Add pagination or infinite scroll for more results.
- Mount the component in a shadow DOM and adopt styles if you want encapsulation.
