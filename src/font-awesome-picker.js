// Font Awesome Picker - vanilla Web Component
// Fetches Font Awesome metadata and lets the user search and copy icon names.
(function () {
  const ICONS_METADATA_URL = './assets/icons.json';

  // Simple debounce
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  class FontAwesomePicker extends HTMLElement {
    constructor() {
      super();
      this._icons = null; // map of name -> meta
      this._results = [];
      this._ready = false;
      this._boundOnInput = debounce(this._onInput.bind(this), 250);
      this._selectedIcons = new Set(); // Store selected icon keys (e.g., "house-solid")
      this._currentPage = 1;
      this._iconsPerPage = 20;
      this._scrollContainer = null;
      this._virtualScrollOffset = 0;
    }

    static get observedAttributes() {
      return ['data-url', 'class', 'style', 'icons-per-page', 'multiple'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'data-url' && oldValue !== newValue && this._ready) {
        this._loadIcons();
      }
      if (name === 'icons-per-page' && oldValue !== newValue) {
        const parsed = parseInt(newValue, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this._iconsPerPage = parsed;
          if (this._ready) {
            this._currentPage = 1; // Reset to first page
            this._renderResults();
          }
        }
      }
      if (name === 'multiple' && oldValue !== newValue && this._ready) {
        // Clear selections when switching modes
        this._clearSelection();
        this._renderResults();
      }
      // Note: class and style are automatically applied to the host element
      // This observer just ensures we're watching for changes
    }

    get isMultipleMode() {
      return this.hasAttribute('multiple') && this.getAttribute('multiple') !== 'false';
    }

    // Public getter: returns full class name(s) of selected icon(s)
    getIconClassName() {
      if (this.isMultipleMode) {
        if (!this._selectedIcons || this._selectedIcons.size === 0) return [];
        return Array.from(this._selectedIcons).map(iconKey => {
          const lastDashIndex = iconKey.lastIndexOf('-');
          const actualStyle = iconKey.substring(lastDashIndex + 1);
          const actualName = iconKey.substring(0, lastDashIndex);
          const styleClass = this._styleToClass(actualStyle);
          return `${styleClass} fa-${actualName}`;
        });
      } else {
        return this._selectedIcon ? this._selectedIcon.classString : '';
      }
    }

    // Public getter: returns SVG text of selected icon(s)
    getIconSVG() {
      if (this.isMultipleMode) {
        if (!this._selectedIcons || this._selectedIcons.size === 0) return [];
        return Array.from(this._selectedIcons).map(iconKey => {
          const lastDashIndex = iconKey.lastIndexOf('-');
          const actualStyle = iconKey.substring(lastDashIndex + 1);
          const actualName = iconKey.substring(0, lastDashIndex);
          const svgData = this._getSvgString(actualName, actualStyle);
          return svgData.raw;
        });
      } else {
        return this._selectedIcon ? this._selectedIcon.svgData.raw : '';
      }
    }

    // Public getter: returns all details of selected icons as array of objects
    getSelectedIcons() {
      if (this.isMultipleMode) {
        if (!this._selectedIcons || this._selectedIcons.size === 0) return [];
        return Array.from(this._selectedIcons).map(iconKey => {
          const lastDashIndex = iconKey.lastIndexOf('-');
          const actualStyle = iconKey.substring(lastDashIndex + 1);
          const actualName = iconKey.substring(0, lastDashIndex);
          const styleClass = this._styleToClass(actualStyle);
          const svgData = this._getSvgString(actualName, actualStyle);
          
          return {
            name: actualName,
            style: actualStyle,
            className: `${styleClass} fa-${actualName}`,
            svg: svgData.raw,
            viewBox: svgData.viewBox,
            width: svgData.width,
            height: svgData.height
          };
        });
      } else {
        if (!this._selectedIcon) return [];
        
        const { name, classString, svgData } = this._selectedIcon;
        return [{
          name: name,
          style: classString.includes('fa-regular') ? 'regular' : 
                 classString.includes('fa-brands') ? 'brands' : 'solid',
          className: classString,
          svg: svgData.raw,
          viewBox: svgData.viewBox,
          width: svgData.width,
          height: svgData.height
        }];
      }
    }

    connectedCallback() {
      if (this._ready) return;
      this._ready = true;

      // Check for icons-per-page attribute
      if (this.hasAttribute('icons-per-page')) {
        const parsed = parseInt(this.getAttribute('icons-per-page'), 10);
        if (!isNaN(parsed) && parsed > 0) {
          this._iconsPerPage = parsed;
        }
      }
           
      this.innerHTML = `
        <div class="fa-picker card p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Search icons</label>
            <input class="input input-bordered w-full" type="search" placeholder="Type icon name (eg: coffee, user, camera)..." />
          </div>
          
          <div class="selection-toolbar mb-4 flex items-center justify-between gap-4" style="display: none;">
            <div class="text-sm font-medium selected-count">0 icons selected</div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-outline clear-selection-btn">Clear Selection</button>
              <button class="btn btn-sm btn-primary export-selected-btn">Export Selected</button>
            </div>
          </div>
          
          <div class="results-container pb-4" style="max-height: 400px; overflow-y: auto; position: relative;">
            <div class="grid grid-cols-5 gap-4 results" aria-live="polite"></div>
          </div>
          
          <div class="pagination-controls mt-4 flex items-center justify-center gap-2" style="display: none;">
            <button class="btn btn-sm btn-outline prev-page-btn">Previous</button>
            <div class="page-info text-sm font-medium"></div>
            <button class="btn btn-sm btn-outline next-page-btn">Next</button>
          </div>
          
          <div class="mt-4 flex items-center justify-between gap-4">
            <div class="text-sm text-muted info flex-1"></div>
            <button class="btn btn-primary btn-sm save-btn" style="display: none;">Download SVG</button>
          </div>
        </div>
      `;

      this._input = this.querySelector('input[type="search"]');
      this._resultsEl = this.querySelector('.results');
      this._infoEl = this.querySelector('.info');
      this._saveBtn = this.querySelector('.save-btn');
      this._selectedIcon = null;
      
      this._selectionToolbar = this.querySelector('.selection-toolbar');
      this._selectedCountEl = this.querySelector('.selected-count');
      this._clearSelectionBtn = this.querySelector('.clear-selection-btn');
      this._exportSelectedBtn = this.querySelector('.export-selected-btn');
      
      this._paginationControls = this.querySelector('.pagination-controls');
      this._prevPageBtn = this.querySelector('.prev-page-btn');
      this._nextPageBtn = this.querySelector('.next-page-btn');
      this._pageInfoEl = this.querySelector('.page-info');
      
      this._scrollContainer = this.querySelector('.results-container');

      this._input.addEventListener('input', (e) => this._boundOnInput(e.target.value.trim()));
      this._input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this._input.value = '';
      });

      this._saveBtn.addEventListener('click', (e) => { e.preventDefault(); this._downloadSvg(); });
      this._clearSelectionBtn.addEventListener('click', (e) => { e.preventDefault(); this._clearSelection(); });
      this._exportSelectedBtn.addEventListener('click', (e) => { e.preventDefault(); this._exportSelected(); });
      this._prevPageBtn.addEventListener('click', (e) => { e.preventDefault(); this._changePage(-1); });
      this._nextPageBtn.addEventListener('click', (e) => { e.preventDefault(); this._changePage(1); });

      this._loadIcons();
    }

    async _loadIcons() {
      this._setInfo('Loading icon metadata...');
      try {
        // Use custom URL from attribute or default
        const metadataUrl = this.getAttribute('data-url') || ICONS_METADATA_URL;
        const res = await fetch(metadataUrl);
        if (!res.ok) throw new Error('Failed to fetch icons metadata');
        const json = await res.json();
        this._icons = json; // object where keys are icon names
        this._setInfo(`Loaded ${Object.keys(this._icons).length} icons`);
      } catch (err) {
        console.error(err);
        this._setInfo('Error loading icons metadata. Check console.');
      }
    }

    _setInfo(text) {
      if (!this._infoEl) return;
      this._infoEl.textContent = text;
    }

    _onInput(value) {
      if (!value) {
        this._results = [];
        this._selectedIcon = null;
        if (!this.isMultipleMode) {
          this._saveBtn.style.display = 'none'; // Hide download button when search is cleared
        }
        this._renderResults();
        this._setInfo('Type to search icons');
        return;
      }

      if (!this._icons) {
        this._setInfo('Still loading icons...');
        return;
      }

      let q = value.toLowerCase().trim();
      const searchResults = [];

      // Check if it's a Font Awesome class string (e.g., "fa-solid fa-money-bill-wave")
      const faClassMatch = q.match(/^(fa-(?:solid|regular|brands|light|thin|duotone|sharp))?\s*fa-(.+)$/);
      if (faClassMatch) {
        // Extract just the icon name without the "fa-" prefix
        q = faClassMatch[2];
      }

      // Split query into words for multi-word search
      const queryWords = q.split(/\s+/).filter(w => w.length > 0);
      const isMultiWord = queryWords.length > 1;

      // Score each icon and collect matches
      for (const name of Object.keys(this._icons)) {
        const meta = this._icons[name];
        const score = isMultiWord 
          ? this._scoreIconMultiWord(name, meta, queryWords)
          : this._scoreIcon(name, meta, q);
        
        if (score > 0) {
          searchResults.push({ name, score });
        }
      }

      // Sort by score (higher is better), then alphabetically
      searchResults.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      });

      this._results = searchResults.map(r => r.name);
      this._currentPage = 1; // Reset to first page on new search
      this._renderResults();
      this._setInfo(`${searchResults.length} ${searchResults.length === 1 ? 'match' : 'matches'} found`);
    }

    _scoreIcon(name, meta, query) {
      let score = 0;
      const nameLower = name.toLowerCase();
      const label = meta.label ? meta.label.toLowerCase() : '';

      // 1. Exact match (highest priority)
      if (nameLower === query) return 1000;
      if (label === query) return 950;

      // 2. Aliases exact match (very high priority)
      if (meta.aliases && meta.aliases.names && Array.isArray(meta.aliases.names)) {
        for (const alias of meta.aliases.names) {
          if (alias.toLowerCase() === query) {
            return 900; // Slightly lower than exact name match
          }
        }
      }

      // 3. Starts with query (very high priority)
      if (nameLower.startsWith(query)) {
        score += 500;
      }

      // 4. Aliases starts with or contains
      if (meta.aliases && meta.aliases.names && Array.isArray(meta.aliases.names)) {
        for (const alias of meta.aliases.names) {
          const aliasLower = alias.toLowerCase();
          if (aliasLower.startsWith(query)) {
            score += 450;
            break;
          } else if (aliasLower.includes(query)) {
            score += 350;
            break;
          }
        }
      }

      // 5. Word boundary match in name (e.g., "home" matches "house-home")
      const nameWords = nameLower.split(/[-_\s]/);
      for (let i = 0; i < nameWords.length; i++) {
        const word = nameWords[i];
        if (word === query) {
          score += 400 - (i * 10); // Earlier words score higher
        } else if (word.startsWith(query)) {
          score += 300 - (i * 10);
        }
      }

      // 6. Contains in name (medium priority)
      if (nameLower.includes(query)) {
        score += 200;
      }

      // 7. Label field match
      if (label.includes(query)) {
        if (label.startsWith(query)) {
          score += 150;
        } else {
          score += 100;
        }
      }

      // 8. Search terms match (lower priority)
      if (meta.search && meta.search.terms && Array.isArray(meta.search.terms)) {
        for (let i = 0; i < meta.search.terms.length; i++) {
          const term = meta.search.terms[i].toLowerCase();
          if (term === query) {
            score += 80 - (i * 2); // Earlier terms score slightly higher
            break;
          } else if (term.startsWith(query)) {
            score += 60 - (i * 2);
            break;
          } else if (term.includes(query)) {
            score += 40 - (i * 2);
            break;
          }
        }
      }

      return score;
    }

    _scoreIconMultiWord(name, meta, queryWords) {
      // For multi-word queries, all words must match somewhere
      // Build searchable text from all fields
      const nameLower = name.toLowerCase();
      const label = meta.label ? meta.label.toLowerCase() : '';
      const aliases = meta.aliases && meta.aliases.names 
        ? meta.aliases.names.map(a => a.toLowerCase()).join(' ')
        : '';
      const searchTerms = meta.search && meta.search.terms && Array.isArray(meta.search.terms)
        ? meta.search.terms.map(t => t.toLowerCase()).join(' ')
        : '';
      
      const allText = `${nameLower} ${label} ${aliases} ${searchTerms}`;

      // Check if all words are present
      const matchedWords = queryWords.filter(word => allText.includes(word));
      if (matchedWords.length !== queryWords.length) {
        return 0; // Not all words found
      }

      // Calculate score based on where words match
      let score = 100; // Base score for matching all words

      for (const word of queryWords) {
        // Bonus for matches in name
        if (nameLower.includes(word)) {
          if (nameLower.startsWith(word)) {
            score += 200; // Name starts with word
          } else if (nameLower.split(/[-_]/).some(part => part === word)) {
            score += 150; // Exact word boundary match
          } else {
            score += 100; // Contains in name
          }
        }
        
        // Bonus for matches in aliases
        if (aliases.includes(word)) {
          score += 80;
        }
        
        // Bonus for matches in label
        if (label.includes(word)) {
          score += 60;
        }
        
        // Bonus for matches in search terms
        if (searchTerms.includes(word)) {
          score += 40;
        }
      }

      // Extra bonus if the full phrase appears in name
      const fullPhrase = queryWords.join(' ');
      if (nameLower.includes(fullPhrase)) {
        score += 300;
      } else if (label.includes(fullPhrase)) {
        score += 200;
      }

      return score;
    }

    _renderResults() {
      this._resultsEl.innerHTML = '';
      if (!this._results.length) {
        this._resultsEl.innerHTML = `<div class="col-span-5 text-center text-sm text-muted">No icons</div>`;
        this._paginationControls.style.display = 'none';
        // Hide download button when no results in single mode
        if (!this.isMultipleMode) {
          this._saveBtn.style.display = 'none';
        }
        return;
      }

      // Pagination logic
      const totalPages = Math.ceil(this._results.length / this._iconsPerPage);
      const startIdx = (this._currentPage - 1) * this._iconsPerPage;
      const endIdx = Math.min(startIdx + this._iconsPerPage, this._results.length);
      const pageResults = this._results.slice(startIdx, endIdx);

      // Show pagination controls if needed
      if (this._results.length > this._iconsPerPage) {
        this._paginationControls.style.display = 'flex';
        this._pageInfoEl.textContent = `Page ${this._currentPage} of ${totalPages} (${this._results.length} icons)`;
        this._prevPageBtn.disabled = this._currentPage === 1;
        this._nextPageBtn.disabled = this._currentPage === totalPages;
      } else {
        this._paginationControls.style.display = 'none';
      }

      // Render icons for current page
      for (const name of pageResults) {
        const meta = this._icons[name] || {};
        const style = (meta.styles && meta.styles[0]) || 'solid';
        const styleClass = this._styleToClass(style);
        const iconKey = `${name}-${style}`;
        
        // Check if this icon is selected (works for both single and multiple modes)
        const isSelected = this.isMultipleMode 
          ? this._selectedIcons.has(iconKey)
          : (this._selectedIcon && this._selectedIcon.name === name && this._selectedIcon.classString.includes(style));

        const item = document.createElement('button');
        item.setAttribute('type', 'button');
        item.className = `flex flex-col items-center gap-2 p-2 bg-base-100 rounded-lg hover:shadow-lg cursor-pointer ${isSelected ? 'border-primary border-2' : ''}`;
        item.dataset.iconKey = iconKey;
        item.innerHTML = `
          <div class="text-2xl"> <i class="${styleClass} fa-${name}"></i> </div>
          <div class="text-xs break-words text-center">${name}</div>
          ${isSelected && this.isMultipleMode ? '<div class="badge badge-primary badge-xs">Selected</div>' : ''}
        `;

        item.addEventListener('click', (e) => {
          e.preventDefault();
          const iconKey = item.dataset.iconKey;
          const classString = `${styleClass} fa-${name}`;
          const svgData = this._getSvgString(name, style);
          
          if (this.isMultipleMode) {
            // Multiple selection mode: toggle selection
            if (this._selectedIcons.has(iconKey)) {
              this._selectedIcons.delete(iconKey);
              item.classList.remove('border-primary', 'border-2');
              const badge = item.querySelector('.badge');
              if (badge) badge.remove();
            } else {
              this._selectedIcons.add(iconKey);
              item.classList.add('border-primary', 'border-2');
              item.innerHTML += '<div class="badge badge-primary badge-xs">Selected</div>';
              
              // Store last selected for single download
              this._selectedIcon = { name, classString, svgData };
            }
            
            this._updateSelectionUI();
            this._dispatchSelectionChange();
          } else {
            // Single selection mode: toggle selection (allow deselect)
            if (this._selectedIcon && this._selectedIcon.name === name && this._selectedIcon.classString === classString) {
              // Deselect if clicking the same icon
              this._selectedIcon = null;
              this._saveBtn.style.display = 'none';
              this._renderResults();
              
              // Dispatch change event with null to indicate deselection
              this.dispatchEvent(new CustomEvent('change', {
                detail: { 
                  icon: null,
                  svg: null,
                  name: null
                },
                bubbles: true,
                composed: true
              }));
            } else {
              // Select new icon
              this._selectedIcon = { name, classString, svgData };
              
              // Re-render to update selection borders across all icons
              this._renderResults();
              
              // Show download button
              this._saveBtn.style.display = 'block';
              
              // Dispatch change event immediately
              this.dispatchEvent(new CustomEvent('change', {
                detail: { 
                  icon: classString,
                  svg: svgData.raw,
                  name: name
                },
                bubbles: true,
                composed: true
              }));
            }
          }
        });

        this._resultsEl.appendChild(item);
      }
    }

    _styleToClass(style) {
      switch (style) {
        case 'solid':
          return 'fa-solid';
        case 'regular':
          return 'fa-regular';
        case 'brands':
          return 'fa-brands';
        default:
          return 'fa-solid';
      }
    }

    _getSvgString(name, style) {
      const meta = this._icons[name];
      if (!meta || !meta.svg || !meta.svg[style]) {
        return { raw: '', viewBox: '0 0 512 512' };
      }
      
      return {
        raw: meta.svg[style].raw || '',
        viewBox: meta.svg[style].viewBox ? meta.svg[style].viewBox.join(' ') : '0 0 512 512',
        width: meta.svg[style].width || 512,
        height: meta.svg[style].height || 512
      };
    }

    _downloadSvg() {
      if (!this._selectedIcon) return;
      
      const { name, classString, svgData } = this._selectedIcon;
      
      if (!svgData.raw) {
        this._setInfo('SVG data not available for this icon');
        return;
      }
      
      // Create blob with SVG content
      const blob = new Blob([svgData.raw], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${classString.replace(/\s+/g, '-')}.svg`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    _changePage(delta) {
      const totalPages = Math.ceil(this._results.length / this._iconsPerPage);
      this._currentPage = Math.max(1, Math.min(totalPages, this._currentPage + delta));
      this._renderResults();
      this._scrollContainer.scrollTop = 0; // Reset scroll position
    }

    _updateSelectionUI() {
      const count = this._selectedIcons ? this._selectedIcons.size : 0;
      
      // Only show selection toolbar in multiple mode
      if (this.isMultipleMode) {
        if (count > 0) {
          this._selectionToolbar.style.display = 'flex';
          this._selectedCountEl.textContent = `${count} icon${count !== 1 ? 's' : ''} selected`;
          this._saveBtn.style.display = count === 1 ? 'block' : 'none';
        } else {
          this._selectionToolbar.style.display = 'none';
          this._saveBtn.style.display = 'none';
        }
      } else {
        // Single mode: always hide selection toolbar
        this._selectionToolbar.style.display = 'none';
      }
    }

    _clearSelection() {
      if (this._selectedIcons) {
        this._selectedIcons.clear();
      }
      this._selectedIcon = null;
      this._updateSelectionUI();
      this._renderResults(); // Re-render to remove selection indicators
      this._dispatchSelectionChange();
    }

    _dispatchSelectionChange() {
      // Only dispatch selectionchange event in multiple mode
      if (!this.isMultipleMode) return;
      if (!this._selectedIcons) return;
      
      const selectedData = Array.from(this._selectedIcons).map(iconKey => {
        // iconKey format: "icon-name-style" e.g., "house-solid" or "arrow-left-solid"
        const lastDashIndex = iconKey.lastIndexOf('-');
        const actualStyle = iconKey.substring(lastDashIndex + 1);
        const actualName = iconKey.substring(0, lastDashIndex);
        const styleClass = this._styleToClass(actualStyle);
        const svgData = this._getSvgString(actualName, actualStyle);
        
        return {
          name: actualName,
          style: actualStyle,
          icon: `${styleClass} fa-${actualName}`,
          svg: svgData.raw
        };
      });

      this.dispatchEvent(new CustomEvent('selectionchange', {
        detail: { 
          selectedIcons: selectedData,
          count: this._selectedIcons.size
        },
        bubbles: true,
        composed: true
      }));
    }

    async _exportSelected() {
      if (!this._selectedIcons || this._selectedIcons.size === 0) {
        this._setInfo('No icons selected');
        return;
      }

      // For bulk export, we'll create a ZIP file using JSZip
      // First, check if JSZip is available
      if (typeof JSZip === 'undefined') {
        // Fallback: download individually
        this._exportSelectedIndividually();
        return;
      }

      try {
        const zip = new JSZip();
        const folder = zip.folder('font-awesome-icons');

        for (const iconKey of this._selectedIcons) {
          const lastDashIndex = iconKey.lastIndexOf('-');
          const actualStyle = iconKey.substring(lastDashIndex + 1);
          const actualName = iconKey.substring(0, lastDashIndex);
          const styleClass = this._styleToClass(actualStyle);
          const svgData = this._getSvgString(actualName, actualStyle);
          
          if (svgData.raw) {
            const filename = `${styleClass.replace(/\s+/g, '-')}-fa-${actualName}.svg`;
            folder.file(filename, svgData.raw);
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `font-awesome-icons-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this._setInfo(`${this._selectedIcons.size} icons exported successfully!`);
      } catch (error) {
        console.error('Export failed:', error);
        this._setInfo('Export failed. Falling back to individual downloads.');
        this._exportSelectedIndividually();
      }
    }

    _exportSelectedIndividually() {
      let downloaded = 0;
      
      for (const iconKey of this._selectedIcons) {
        const actualStyle = iconKey.split('-').pop();
        const actualName = iconKey.substring(0, iconKey.lastIndexOf('-' + actualStyle));
        const styleClass = this._styleToClass(actualStyle);
        const svgData = this._getSvgString(actualName, actualStyle);
        
        if (svgData.raw) {
          setTimeout(() => {
            const blob = new Blob([svgData.raw], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${styleClass.replace(/\s+/g, '-')}-fa-${actualName}.svg`;
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, downloaded * 100); // Delay each download slightly
          
          downloaded++;
        }
      }
      
      this._setInfo(`Downloading ${downloaded} icons individually...`);
    }
  }

  customElements.define('font-awesome-picker', FontAwesomePicker);
})();
