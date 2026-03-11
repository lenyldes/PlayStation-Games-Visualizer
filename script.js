// PlayStation Games Visualizer
// Main JavaScript file for data loading, filtering, and rendering

class GamesVisualizer {
    constructor() {
        this.games = [];
        this.filteredGames = [];
        this.currentPage = 1;
        this.gamesPerPage = 24;
        this.filterState = {
            name: '',
            priceMin: null,
            priceMax: null,
            discountMin: null,
            discountMax: null,
            productTypes: new Set(),
            voices: new Set(),
            screenLanguages: new Set()
        };
        this.sortState = 'name-asc';
        
        this.init();
    }

    // Initialize the application
    async init() {
        console.log('🔧 PlayStation Games Visualizer initializing...');
        console.log(`📊 Games per page: ${this.gamesPerPage}`);
        
        this.bindEvents();
        await this.loadData();
        this.generateFilterOptions();
        this.applyFilters();
        
        console.log('✅ Application initialized successfully');
    }

    // Bind event listeners
    bindEvents() {
        // Search input
        document.getElementById('nameSearch').addEventListener('input', (e) => {
            this.filterState.name = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Price range inputs
        document.getElementById('priceMin').addEventListener('input', (e) => {
            this.filterState.priceMin = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        document.getElementById('priceMax').addEventListener('input', (e) => {
            this.filterState.priceMax = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        // Discount range inputs
        document.getElementById('discountMin').addEventListener('input', (e) => {
            this.filterState.discountMin = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        document.getElementById('discountMax').addEventListener('input', (e) => {
            this.filterState.discountMax = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });

        // Sort select
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortState = e.target.value;
            this.applyFilters();
        });

        // Reset filters button
        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });
    }

    // Load data from JSON file
    async loadData() {
        try {
            console.log('📥 Loading games data from out.json...');
            const response = await fetch('out.json');
            if (!response.ok) {
                throw new Error('Failed to load data');
            }
            
            const data = await response.json();
            this.games = data.map(game => this.processGameData(game));
            
            console.log(`✅ Loaded ${this.games.length} games`);
            console.log(`💰 Price range: Rs ${Math.min(...this.games.map(g => g.offerPrice))} - Rs ${Math.max(...this.games.map(g => g.offerPrice))}`);
            console.log(`🎯 Discount range: ${Math.min(...this.games.map(g => g.discountPercent))}% - ${Math.max(...this.games.map(g => g.discountPercent))}%`);
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('❌ Error loading data:', error);
            document.getElementById('loading').textContent = 'Error loading games data';
        }
    }

    // Process individual game data
    processGameData(game) {
        // Parse prices and calculate discount
        const offerPrice = this.parsePrice(game.offerPrice);
        const originalPrice = this.parsePrice(game.originalPrice);
        const discountPercent = originalPrice > 0 ? 
            Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : 0;

        // Combine voice languages from all fields
        const voiceLanguages = this.combineLanguages([
            game.voice,
            game.ps5Voice,
            game.ps4Voice
        ]);

        // Combine screen languages from all fields
        const screenLanguages = this.combineLanguages([
            game.screenLanguages,
            game.ps5ScreenLanguages,
            game.ps4ScreenLanguages
        ]);

        return {
            ...game,
            offerPrice,
            originalPrice,
            discountPercent,
            voiceLanguages,
            screenLanguages
        };
    }

    // Parse price string to number
    parsePrice(priceStr) {
        if (!priceStr || priceStr === 'Rs ') return 0;
        // Remove 'Rs', non-breaking spaces, commas, and convert to number
        const price = priceStr.replace(/Rs\s*|\u00A0|,/g, '').trim();
        return parseInt(price) || 0;
    }

    // Combine languages from multiple fields
    combineLanguages(languageArrays) {
        const allLanguages = new Set();
        
        languageArrays.forEach(langStr => {
            if (langStr && langStr.trim()) {
                langStr.split(',').forEach(lang => {
                    const trimmedLang = lang.trim();
                    if (trimmedLang) {
                        allLanguages.add(trimmedLang);
                    }
                });
            }
        });
        
        return Array.from(allLanguages);
    }

    // Generate filter options based on unique values
    generateFilterOptions() {
        const productTypes = new Set();
        const voices = new Set();
        const screenLanguages = new Set();

        this.games.forEach(game => {
            if (game.productType) productTypes.add(game.productType);
            game.voiceLanguages.forEach(lang => voices.add(lang));
            game.screenLanguages.forEach(lang => screenLanguages.add(lang));
        });

        this.createCheckboxGroup('productTypeFilters', Array.from(productTypes).sort(), 'productTypes');
        this.createCheckboxGroup('voiceFilters', Array.from(voices).sort(), 'voices');
        this.createCheckboxGroup('screenLanguagesFilters', Array.from(screenLanguages).sort(), 'screenLanguages');
    }

    // Create checkbox group for filter options
    createCheckboxGroup(containerId, options, filterKey) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        options.forEach(option => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${filterKey}-${option.replace(/\s+/g, '-')}`;
            checkbox.value = option;
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.filterState[filterKey].add(option);
                } else {
                    this.filterState[filterKey].delete(option);
                }
                this.applyFilters();
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = option;

            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            container.appendChild(checkboxItem);
        });
    }

    // Apply all filters and sorting
    applyFilters() {
        const startTime = performance.now();
        
        let filtered = this.games.filter(game => {
            // Name filter
            if (this.filterState.name && !game.name.toLowerCase().includes(this.filterState.name)) {
                return false;
            }

            // Price range filter
            if (this.filterState.priceMin !== null && game.offerPrice < this.filterState.priceMin) {
                return false;
            }
            if (this.filterState.priceMax !== null && game.offerPrice > this.filterState.priceMax) {
                return false;
            }

            // Discount range filter
            if (this.filterState.discountMin !== null && game.discountPercent < this.filterState.discountMin) {
                return false;
            }
            if (this.filterState.discountMax !== null && game.discountPercent > this.filterState.discountMax) {
                return false;
            }

            // Product type filter
            if (this.filterState.productTypes.size > 0 && !this.filterState.productTypes.has(game.productType)) {
                return false;
            }

            // Voice languages filter
            if (this.filterState.voices.size > 0) {
                const hasVoiceMatch = game.voiceLanguages.some(lang => 
                    this.filterState.voices.has(lang)
                );
                if (!hasVoiceMatch) return false;
            }

            // Screen languages filter
            if (this.filterState.screenLanguages.size > 0) {
                const hasScreenMatch = game.screenLanguages.some(lang => 
                    this.filterState.screenLanguages.has(lang)
                );
                if (!hasScreenMatch) return false;
            }

            return true;
        });

        // Apply sorting
        filtered = this.sortGames(filtered);
        
        const endTime = performance.now();
        
        console.log(`🔍 Filtering completed:`);
        console.log(`   📊 Total games: ${this.games.length}`);
        console.log(`   🎯 Filtered games: ${filtered.length}`);
        console.log(`   ⚡ Processing time: ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`   🎚️  Active filters:`);
        console.log(`      - Name search: "${this.filterState.name}"`);
        console.log(`      - Price range: ${this.filterState.priceMin || 'min'} - ${this.filterState.priceMax || 'max'}`);
        console.log(`      - Discount range: ${this.filterState.discountMin || 'min'}% - ${this.filterState.discountMax || 'max'}%`);
        console.log(`      - Product types: ${Array.from(this.filterState.productTypes).length} selected`);
        console.log(`      - Voice languages: ${Array.from(this.filterState.voices).length} selected`);
        console.log(`      - Screen languages: ${Array.from(this.filterState.screenLanguages).length} selected`);
        console.log(`      - Sorting: ${this.sortState}`);
        
        this.filteredGames = filtered;
        this.currentPage = 1;
        this.renderGames();
        this.updateResultsInfo();
    }

    // Sort games based on current sort state
    sortGames(games) {
        return [...games].sort((a, b) => {
            switch (this.sortState) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'price-asc':
                    return a.offerPrice - b.offerPrice;
                case 'price-desc':
                    return b.offerPrice - a.offerPrice;
                case 'discount-asc':
                    return a.discountPercent - b.discountPercent;
                case 'discount-desc':
                    return b.discountPercent - a.discountPercent;
                default:
                    return 0;
            }
        });
    }

    // Render games grid with pagination
    renderGames() {
        const gamesGrid = document.getElementById('gamesGrid');
        const startIndex = (this.currentPage - 1) * this.gamesPerPage;
        const endIndex = startIndex + this.gamesPerPage;
        const gamesToShow = this.filteredGames.slice(startIndex, endIndex);

        gamesGrid.innerHTML = '';

        console.log(`🔄 Rendering page ${this.currentPage}:`);
        console.log(`   📄 Showing games ${startIndex + 1}-${Math.min(endIndex, this.filteredGames.length)} of ${this.filteredGames.length}`);
        console.log(`   🎮 Games on this page: ${gamesToShow.length}`);

        gamesToShow.forEach(game => {
            const gameCard = this.createGameCard(game);
            gamesGrid.appendChild(gameCard);
        });

        this.renderPagination();
    }

    // Create individual game card
    createGameCard(game) {
        const card = document.createElement('a');
        card.className = 'game-card';
        card.href = game.link;
        card.target = '_blank';

        card.innerHTML = `
            <div class="game-image">
                <img src="${game.imgURL}" alt="${game.name}" loading="lazy" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     onload="this.nextElementSibling.style.display='none';">
                <div class="image-placeholder" style="display: none;">
                    Image not available
                    <button class="retry-btn" onclick="event.stopPropagation(); visualizer.retryImageLoad(this.previousElementSibling, '${game.imgURL}')">🔄 Retry</button>
                </div>
            </div>
            <div class="game-info">
                <div class="game-name" title="${game.name}">${game.name}</div>
                <div class="game-price">
                    <span class="current-price">Rs ${game.offerPrice.toLocaleString()}</span>
                    ${game.originalPrice > game.offerPrice ? 
                        `<span class="original-price">Rs ${game.originalPrice.toLocaleString()}</span>` : ''}
                    ${game.discountPercent > 0 ? 
                        `<span class="discount-percent">Save ${game.discountPercent}%</span>` : ''}
                </div>
                <div class="game-type">${game.productType}</div>
            </div>
        `;

        return card;
    }

    // Retry image loading
    retryImageLoad(imgElement, imgURL) {
        console.log(`🖼️  Retrying image load: ${imgURL}`);
        imgElement.src = imgURL;
        imgElement.style.display = 'block';
        imgElement.nextElementSibling.style.display = 'none';
    }

    // Render pagination controls
    renderPagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredGames.length / this.gamesPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // First page (only show if not already showing page 1)
        if (this.currentPage > 1 && this.currentPage > 3) {
            paginationHTML += `<button class="page-btn" onclick="visualizer.goToPage(1)">1</button>`;
            
            // Ellipsis before current page
            if (this.currentPage > 4) {
                paginationHTML += `<span class="ellipsis">...</span>`;
            }
        }

        // Previous pages
        for (let i = Math.max(1, this.currentPage - 2); i < this.currentPage; i++) {
            paginationHTML += `<button class="page-btn" onclick="visualizer.goToPage(${i})">${i}</button>`;
        }

        // Current page
        paginationHTML += `<button class="page-btn active">${this.currentPage}</button>`;

        // Next pages
        for (let i = this.currentPage + 1; i <= Math.min(totalPages, this.currentPage + 2); i++) {
            paginationHTML += `<button class="page-btn" onclick="visualizer.goToPage(${i})">${i}</button>`;
        }

        // Ellipsis after current page
        if (this.currentPage < totalPages - 3) {
            paginationHTML += `<span class="ellipsis">...</span>`;
        }

        // Last page (only show if not already showing last page)
        if (this.currentPage < totalPages - 2) {
            paginationHTML += `<button class="page-btn" onclick="visualizer.goToPage(${totalPages})">${totalPages}</button>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    // Navigate to specific page
    goToPage(page) {
        console.log(`📄 Navigating to page ${page}`);
        this.currentPage = page;
        this.renderGames();
        this.updateResultsInfo();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update results information
    updateResultsInfo() {
        const totalGames = this.filteredGames.length;
        const totalPages = Math.ceil(totalGames / this.gamesPerPage);
        const startGame = Math.min(totalGames, (this.currentPage - 1) * this.gamesPerPage + 1);
        const endGame = Math.min(totalGames, this.currentPage * this.gamesPerPage);

        document.getElementById('resultsCount').textContent = 
            `${startGame}-${endGame} of ${totalGames} games`;
        document.getElementById('currentPage').textContent = 
            `Page ${this.currentPage} of ${totalPages}`;
    }

    // Reset all filters
    resetFilters() {
        console.log('🔄 Resetting all filters');
        
        // Reset filter state
        this.filterState = {
            name: '',
            priceMin: null,
            priceMax: null,
            discountMin: null,
            discountMax: null,
            productTypes: new Set(),
            voices: new Set(),
            screenLanguages: new Set()
        };

        // Reset UI elements
        document.getElementById('nameSearch').value = '';
        document.getElementById('priceMin').value = '';
        document.getElementById('priceMax').value = '';
        document.getElementById('discountMin').value = '';
        document.getElementById('discountMax').value = '';
        document.getElementById('sortSelect').value = 'name-asc';

        // Uncheck all checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.sortState = 'name-asc';
        this.applyFilters();
    }
}

// Initialize the visualizer when the page loads
let visualizer;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 PlayStation Games Visualizer starting...');
    console.log('🌐 User agent:', navigator.userAgent);
    console.log('💻 Screen size:', `${screen.width}x${screen.height}`);
    console.log('🖥️  Viewport size:', `${window.innerWidth}x${window.innerHeight}`);
    
    visualizer = new GamesVisualizer();
});

// Add error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('❌ Uncaught error:', event.error);
});

// Log when page is unloaded
window.addEventListener('beforeunload', () => {
    console.log('👋 PlayStation Games Visualizer closing...');
});