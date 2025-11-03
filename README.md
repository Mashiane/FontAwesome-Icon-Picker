# Font Awesome Picker (Vanilla Web Component)

A lightweight, dependency-free vanilla JavaScript web component for searching and selecting Font Awesome icons. Supports both single and multiple selection modes with SVG download and ZIP export capabilities.

You can check this YouTube Video Out: https://youtu.be/l0c0_GVylCs

## Files

- **`src/font-awesome-picker.js`** - Main web component implementation
- **`src/font-awesome-picker.min.js`** - Minified production build
- **`index.html`** - Demo page with single and multiple selection examples
- **`assets/icons.min.json`** - Font Awesome icon metadata (loaded via data-url attribute)

## Features

- 🔍 Real-time icon search with pagination
- ✅ Single or multiple selection modes
- 📥 Download individual SVG files
- 📦 Export multiple icons as ZIP archive
- 🎨 Style-aware (supports solid, regular, brands)
- 🎯 Toggle selection in single mode (click to deselect)
- 📱 Responsive grid layout (adapts to modals and narrow containers)
- 🚫 No external dependencies (JSZip optional for ZIP export)

## Quick Usage

```html
<!-- Include Font Awesome CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css">

<!-- Include the component -->
<script src="src/font-awesome-picker.js"></script>

<!-- Single selection mode -->
<font-awesome-picker data-url="assets/icons.min.json"></font-awesome-picker>

<!-- Multiple selection mode -->
<font-awesome-picker data-url="assets/icons.min.json" multiple></font-awesome-picker>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-url` | String | Required | URL to Font Awesome icon metadata JSON |
| `icons-per-page` | Number | `50` | Number of icons displayed per page |
| `multiple` | Boolean | `false` | Enable multiple icon selection mode |
| `class` | String | - | CSS classes for the component container |
| `style` | String | - | Inline styles for the component container |

## Events

### `change` (Single Mode)
Fired when selection changes in single-select mode.

```javascript
picker.addEventListener('change', (e) => {
  console.log(e.detail); // Icon object or null if deselected
  // { name, style, className, svg, viewBox, width, height }
});
```

### `selectionchange` (Multiple Mode)
Fired when selection changes in multiple-select mode.

```javascript
picker.addEventListener('selectionchange', (e) => {
  console.log(e.detail); // Array of icon objects
  // [{ name, style, className, svg, viewBox, width, height }, ...]
});
```

## Public API

### `getIconClassName()`
Returns the Font Awesome class name(s) for selected icon(s).

- **Single mode**: Returns string (e.g., `"fa-solid fa-coffee"`) or `""` if none selected
- **Multiple mode**: Returns array of strings (e.g., `["fa-solid fa-coffee", "fa-regular fa-heart"]`)

```javascript
const picker = document.querySelector('font-awesome-picker');
const className = picker.getIconClassName();
```

### `getIconSVG()`
Returns the SVG markup for selected icon(s).

- **Single mode**: Returns string (SVG markup) or `""` if none selected
- **Multiple mode**: Returns array of strings (SVG markup for each icon)

```javascript
const svg = picker.getIconSVG();
```

### `getSelectedIcons()`
Returns full icon metadata for selected icon(s).

- **Always returns an array** (empty if none selected)
- Each object contains: `{name, style, className, svg, viewBox, width, height}`

```javascript
const icons = picker.getSelectedIcons();
icons.forEach(icon => {
  console.log(icon.name, icon.className);
});
```

### `clearInput()`
Clears the search input field without affecting current selection.

```javascript
picker.clearInput();
```

## Export Behavior

### Single Selection Mode
- **Download SVG** button downloads the selected icon as an SVG file
- Disabled when no icon is selected

### Multiple Selection Mode
- **Export Selected** button creates a ZIP archive containing all selected icons
- Requires [JSZip](https://stuk.github.io/jszip/) library
- Include JSZip before using export:
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  ```

## Demo

Run the demo locally:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

Then open http://localhost:8000 in your browser.

The demo shows both single and multiple selection modes with test buttons to exercise the public API methods.

## Developer Notes

### Building
Minify the component using terser:

```bash
npx terser src/font-awesome-picker.js -o src/font-awesome-picker.min.js -c -m
```

### Icon Data Format
The component expects JSON with this structure:

```json
{
  "icon-name": {
    "styles": ["solid", "regular"],
    "svg": {
      "solid": {
        "viewBox": "0 0 512 512",
        "path": "<path d='...'/>",
        "width": 512,
        "height": 512
      }
    }
  }
}
```

### Styling
The component uses inline styles and utility classes. For custom styling, you can:
- Add `class` or `style` attributes to the component
- Override the internal styles by targeting the component's child elements
- The demo uses [DaisyUI](https://daisyui.com/) for optional styling

## Troubleshooting

**Icons not loading?**
- Verify the `data-url` attribute points to valid icon metadata JSON
- Check browser console for network errors
- Ensure CORS is configured if loading from a different origin

**Export not working?**
- Include JSZip library for multiple icon export
- Check browser console for JSZip errors
- Verify `window.JSZip` is available

**Text overlapping in modals?**
- The component uses responsive grid layout with word-wrapping
- Ensure parent container has defined width
- Minimum icon width is 80px

## Contributing

This is a vanilla JavaScript component with no build dependencies (terser for minification only). Feel free to fork and customize for your needs.
