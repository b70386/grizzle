// ============================================
// KONFIGURASI TMDB API
// ============================================
const TMDB_API_KEY = 'MASUKKAN API KEY ANDA DISINI';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

// Domain embed streaming
const EMBED_DOMAINS = [
    'https://vidfast.pro',
	'https://vidfast.io',
    'https://vidsrc-embed.su',
	'https://vsembed.ru',
    'https://vidfast.pro',
    'https://vidsrc-embed.ru',

    'https://vidsrc.me'
];

// State
let allMovies = [];
let allTvShows = [];
let embedIndex = 0;
let currentDetailMedia = null;
let currentTvDetails = null;

// ============================================
// WATCHLIST (localStorage)
// ============================================
const WATCHLIST_KEY = 'grizzle_watchlist';

function getWatchlist() {
    const watchlist = localStorage.getItem(WATCHLIST_KEY);
    if (watchlist) {
        try {
            return JSON.parse(watchlist);
        } catch (e) {
            return [];
        }
    }
    return [];
}

function saveWatchlist(watchlist) {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

function isInWatchlist(id, type) {
    const watchlist = getWatchlist();
    return watchlist.some(item => item.id === id && item.type === type);
}

function addToWatchlist(id, type, title, posterPath, year) {
    const watchlist = getWatchlist();
    if (!isInWatchlist(id, type)) {
        watchlist.push({ id, type, title, posterPath, year, addedAt: Date.now() });
        saveWatchlist(watchlist);
        showNotification(`✅ "${title}" added to watchlist!`);
        return true;
    }
    return false;
}

function removeFromWatchlist(id, type) {
    let watchlist = getWatchlist();
    const removed = watchlist.find(item => item.id === id && item.type === type);
    watchlist = watchlist.filter(item => !(item.id === id && item.type === type));
    saveWatchlist(watchlist);
    if (removed) {
        showNotification(`❌ "${removed.title}" removed from watchlist`);
    }
    return removed;
}

function toggleWatchlist(id, type, title, posterPath, year) {
    if (isInWatchlist(id, type)) {
        removeFromWatchlist(id, type);
        return false;
    } else {
        addToWatchlist(id, type, title, posterPath, year);
        return true;
    }
}

function renderWatchlistGrid() {
    const watchlist = getWatchlist();
    const container = document.getElementById('watchlistGrid');
    if (!container) return;
    
    if (watchlist.length === 0) {
        container.innerHTML = '<div class="loading">⭐ No items in watchlist yet. Add some movies or TV shows!</div>';
        return;
    }
    
    container.innerHTML = watchlist.map(item => `
        <div class="movie-card" data-id="${item.id}" data-type="${item.type}" data-title="${escapeHtml(item.title)}">
            <img class="movie-poster" src="${item.posterPath ? IMAGE_BASE_URL + item.posterPath : 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${escapeHtml(item.title)}" loading="lazy">
            <div class="movie-info">
                <div class="movie-title">${escapeHtml(item.title)}</div>
                <div class="movie-year">${item.year || 'TBA'}</div>
            </div>
            <button class="watchlist-btn in-watchlist" data-id="${item.id}" data-type="${item.type}" data-title="${escapeHtml(item.title)}" data-poster="${item.posterPath || ''}" data-year="${item.year || ''}">⭐</button>
        </div>
    `).join('');
    
    document.querySelectorAll('#watchlistGrid .movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('watchlist-btn')) {
                e.stopPropagation();
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                const title = e.target.dataset.title;
                const poster = e.target.dataset.poster;
                const year = e.target.dataset.year;
                removeFromWatchlist(id, type);
                renderWatchlistGrid();
                return;
            }
            const id = card.dataset.id;
            const mediaType = card.dataset.type;
            const title = card.dataset.title;
            showMovieDetail(id, mediaType);
        });
    });
}

// ============================================
// NOTIFICATION
// ============================================
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Grizzle', { body: message, icon: '/icon.png' });
    }
    console.log('Notification:', message);
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// ============================================
// DARK/LIGHT MODE
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('grizzle_theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        document.body.setAttribute('data-theme', theme);
        updateThemeButton(theme);
    }
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('grizzle_theme', newTheme);
    updateThemeButton(newTheme);
}

// ============================================
// FUNGSI DASAR
// ============================================
function getEmbedDomain() {
    embedIndex = (embedIndex + 1) % EMBED_DOMAINS.length;
    return EMBED_DOMAINS[embedIndex];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// FALLBACK DATA
// ============================================
function getFallbackMovies() {
    return [
        { id: 1, title: "Inception", poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", release_date: "2010-07-16" },
        { id: 2, title: "Interstellar", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", release_date: "2014-11-07" },
        { id: 3, title: "The Dark Knight", poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", release_date: "2008-07-18" },
        { id: 4, title: "John Wick", poster_path: "/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg", release_date: "2014-10-22" },
        { id: 5, title: "Avengers Endgame", poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg", release_date: "2019-04-24" },
        { id: 6, title: "Joker", poster_path: "/udDclJoHjfjb8EkxOU4RnFyWNLk.jpg", release_date: "2019-10-02" },
        { id: 7, title: "Deadpool", poster_path: "/fSRb7vySH8XY0WpHvUyO4R5y2aY.jpg", release_date: "2016-02-09" },
        { id: 8, title: "The Matrix", poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", release_date: "1999-03-30" }
    ];
}

function getFallbackTv() {
    return [
        { id: 1, name: "Stranger Things", poster_path: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg", first_air_date: "2016-07-15" },
        { id: 2, name: "The Witcher", poster_path: "/7vjaCdMwSxXOMqxYov1XpK8bVgO.jpg", first_air_date: "2019-12-20" },
        { id: 3, name: "Breaking Bad", poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", first_air_date: "2008-01-20" },
        { id: 4, name: "Game of Thrones", poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", first_air_date: "2011-04-17" },
        { id: 5, name: "The Mandalorian", poster_path: "/sWgBv7LVpPRWgjB2zTklxEdlpC4.jpg", first_air_date: "2019-11-12" },
        { id: 6, name: "Wednesday", poster_path: "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg", first_air_date: "2022-11-16" }
    ];
}

// ============================================
// API CALLS KE TMDB
// ============================================
async function fetchFromTMDB(endpoint) {
    try {
        const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('TMDB API error:', error);
        if (endpoint.includes('/movie/popular')) return { results: getFallbackMovies() };
        if (endpoint.includes('/tv/popular')) return { results: getFallbackTv() };
        if (endpoint.includes('/trending/movie')) return { results: getFallbackMovies() };
        if (endpoint.includes('/movie/')) return { imdb_id: 'tt1375666' };
        if (endpoint.includes('/tv/')) return { external_ids: { imdb_id: 'tt4574334' } };
        return null;
    }
}

async function getTrendingMovies() {
    const data = await fetchFromTMDB('/trending/movie/week');
    return data?.results || getFallbackMovies();
}

async function getPopularMovies() {
    const data = await fetchFromTMDB('/movie/popular');
    allMovies = data?.results || getFallbackMovies();
    return allMovies;
}

async function getPopularTv() {
    const data = await fetchFromTMDB('/tv/popular');
    allTvShows = data?.results || getFallbackTv();
    return allTvShows;
}

async function getMovieDetails(id) {
    return await fetchFromTMDB(`/movie/${id}`);
}

async function getTvDetails(id) {
    return await fetchFromTMDB(`/tv/${id}`);
}

async function getTvSeasons(tvId, seasonNumber) {
    return await fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`);
}

// ============================================
// EMBED URL GENERATOR
// ============================================
function getMovieEmbedUrl(imdbId, tmdbId) {
    const domain = getEmbedDomain();
    
    // PRIORITAS: IMDb ID dulu, baru TMDB ID
    let finalId = imdbId;
    let useTmdb = false;
    
    if (!finalId && tmdbId) {
        finalId = tmdbId.toString();
        useTmdb = true;
    }
    
    if (!finalId) {
        finalId = 'tt1375666';
    }
    
    // Cek apakah domain mendukung format query parameter
    const supportsQueryFormat = domain.includes('vidsrc-embed') || domain.includes('vidsrcme') || domain.includes('vsrc');
    
    if (supportsQueryFormat) {
        if (useTmdb) {
            return `${domain}/embed/movie?tmdb=${finalId}&autoplay=1`;
        } else {
            return `${domain}/embed/movie?imdb=${finalId}&autoplay=1`;
        }
    } else {
        // Format path untuk vidfast domain
        return `${domain}/movie/${finalId}?autoPlay=true&title=true`;
    }
}

function getTvEmbedUrl(imdbId, tmdbId, season, episode) {
    const domain = getEmbedDomain();
    
    // PRIORITAS UTAMA: Gunakan IMDb ID jika ada (karena lebih universal)
    let finalId = imdbId;
    let useTmdb = false;
    
    // Jika IMDb ID tidak ada, gunakan TMDB ID dalam bentuk ANGKA
    if (!finalId && tmdbId) {
        finalId = tmdbId.toString();
        useTmdb = true;
    }
    
    // Fallback jika kedua ID tidak ada
    if (!finalId) {
        console.warn('No ID found for TV embed, using fallback');
        finalId = '4574334';
        useTmdb = true;
    }
    
    // Cek apakah domain mendukung format query parameter
    const supportsQueryFormat = domain.includes('vidsrc-embed') || domain.includes('vidsrcme') || domain.includes('vsrc');
    
    if (supportsQueryFormat) {
        // Format query parameter untuk vidsrc-embed domain
        if (useTmdb) {
            return `${domain}/embed/tv?tmdb=${finalId}&season=${season}&episode=${episode}&autoplay=1&autonext=1`;
        } else {
            return `${domain}/embed/tv?imdb=${finalId}&season=${season}&episode=${episode}&autoplay=1&autonext=1`;
        }
    } else {
        // Format path untuk vidfast domain
        return `${domain}/tv/${finalId}/${season}/${episode}?autoPlay=true&nextButton=true`;
    }
}
// ============================================

// ============================================
// RENDER MOVIE GRID
// ============================================
function renderMovieGrid(containerId, items, type = 'movie') {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="loading">No content available</div>';
        return;
    }
    
    const displayItems = items.slice(0, 20);
    container.innerHTML = displayItems.map(item => {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const posterPath = item.poster_path;
        const posterUrl = posterPath ? `${IMAGE_BASE_URL}${posterPath}` : 'https://via.placeholder.com/300x450?text=No+Poster';
        const inWatchlist = isInWatchlist(item.id, type);
        
        return `
            <div class="movie-card" data-id="${item.id}" data-type="${type}" data-title="${escapeHtml(title)}">
                <img class="movie-poster" src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="movie-info">
                    <div class="movie-title">${escapeHtml(title)}</div>
                    <div class="movie-year">${year || 'TBA'}</div>
                </div>
                <button class="watchlist-btn ${inWatchlist ? 'in-watchlist' : ''}" data-id="${item.id}" data-type="${type}" data-title="${escapeHtml(title)}" data-poster="${posterPath || ''}" data-year="${year || ''}">⭐</button>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll(`#${containerId} .movie-card`).forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('watchlist-btn')) {
                e.stopPropagation();
                const id = e.target.dataset.id;
                const mediaType = e.target.dataset.type;
                const title = e.target.dataset.title;
                const poster = e.target.dataset.poster;
                const year = e.target.dataset.year;
                toggleWatchlist(id, mediaType, title, poster, year);
                renderMovieGrid(containerId, items, type);
                if (document.getElementById('watchlistSection') && document.getElementById('watchlistSection').style.display === 'block') {
                    renderWatchlistGrid();
                }
                return;
            }
            const id = card.dataset.id;
            const mediaType = card.dataset.type;
            showMovieDetail(id, mediaType);
        });
    });
}

// ============================================
// MOVIE DETAIL PAGE
// ============================================
async function showMovieDetail(id, type) {
    const detailSection = document.getElementById('detailSection');
    const movieSection = document.getElementById('movieSection');
    const tvSection = document.getElementById('tvSection');
    const searchSection = document.getElementById('searchSection');
    const watchlistSection = document.getElementById('watchlistSection');
    const detailContainer = document.getElementById('detailContainer');
    
    detailContainer.innerHTML = '<div class="loading">Loading details...</div>';
    
    detailSection.style.display = 'block';
    movieSection.style.display = 'none';
    tvSection.style.display = 'none';
    searchSection.style.display = 'none';
    if (watchlistSection) watchlistSection.style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
        let data;
        if (type === 'movie') {
            data = await getMovieDetails(id);
            currentDetailMedia = { ...data, type: 'movie' };
            renderMovieDetail(data, 'movie');
        } else {
            data = await getTvDetails(id);
            currentDetailMedia = { ...data, type: 'tv' };
            currentTvDetails = data;
            renderTvDetail(data, 'tv');
        }
    } catch (error) {
        console.error('Error loading detail:', error);
        detailContainer.innerHTML = '<div class="loading">Error loading details. Please try again.</div>';
    }
}

function renderMovieDetail(movie, type) {
    const container = document.getElementById('detailContainer');
    const title = movie.title;
    const year = (movie.release_date || '').split('-')[0];
    const backdropUrl = movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : '';
    const posterUrl = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const inWatchlist = isInWatchlist(movie.id, type);
    
    container.innerHTML = `
        <button class="back-btn" id="backFromDetail">← Back to Home</button>
        <div class="detail-container">
            <div class="detail-backdrop" style="background-image: url('${backdropUrl}'); background-size: cover; background-position: center;">
            </div>
            <div class="detail-content">
                <img class="detail-poster" src="${posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${escapeHtml(title)}">
                <h1 class="detail-title">${escapeHtml(title)} (${year || 'TBA'})</h1>
                <div class="detail-meta">
                    <span>⭐ ${rating}/10</span>
                    <span>🎬 ${movie.release_date || 'Unknown release date'}</span>
                    ${movie.runtime ? `<span>⏱️ ${movie.runtime} min</span>` : ''}
                </div>
                <p class="detail-overview">${escapeHtml(movie.overview) || 'No overview available.'}</p>
                <div class="detail-actions">
                    <button class="play-btn" id="playFromDetail">▶ Play Now</button>
                    <button class="watchlist-detail-btn ${inWatchlist ? 'in-watchlist' : ''}" id="watchlistFromDetail">${inWatchlist ? '⭐ In Watchlist' : '☆ Add to Watchlist'}</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('backFromDetail')?.addEventListener('click', () => {
        detailSection.style.display = 'none';
        movieSection.style.display = 'block';
        tvSection.style.display = 'block';
        if (allMovies.length) renderMovieGrid('movieGrid', allMovies.slice(0, 12), 'movie');
        if (allTvShows.length) renderMovieGrid('tvGrid', allTvShows.slice(0, 12), 'tv');
    });
    
    document.getElementById('playFromDetail')?.addEventListener('click', async () => {
        const imdbId = movie.imdb_id;
        const embedUrl = getMovieEmbedUrl(imdbId, movie.id);
        openPlayer(embedUrl, title);
    });
    
    document.getElementById('watchlistFromDetail')?.addEventListener('click', () => {
        const newStatus = toggleWatchlist(movie.id, type, title, movie.poster_path, year);
        const btn = document.getElementById('watchlistFromDetail');
        if (btn) {
            btn.textContent = newStatus ? '⭐ In Watchlist' : '☆ Add to Watchlist';
            if (newStatus) btn.classList.add('in-watchlist');
            else btn.classList.remove('in-watchlist');
        }
    });
}

// ============================================
// TV DETAIL PAGE DENGAN EPISODE LIST LANGSUNG
// ============================================
function renderTvDetail(tv, type) {
    const container = document.getElementById('detailContainer');
    const title = tv.name;
    const year = (tv.first_air_date || '').split('-')[0];
    const backdropUrl = tv.backdrop_path ? `${BACKDROP_BASE_URL}${tv.backdrop_path}` : '';
    const posterUrl = tv.poster_path ? `${IMAGE_BASE_URL}${tv.poster_path}` : '';
    const rating = tv.vote_average ? tv.vote_average.toFixed(1) : 'N/A';
    const inWatchlist = isInWatchlist(tv.id, type);
    const seasonsCount = tv.number_of_seasons || 1;
    
    // Build season options
    let seasonOptions = '';
    for (let i = 1; i <= seasonsCount; i++) {
        seasonOptions += `<option value="${i}">Season ${i}</option>`;
    }
    
    container.innerHTML = `
        <button class="back-btn" id="backFromDetail">← Back to Home</button>
        <div class="detail-container">
            <div class="detail-backdrop" style="background-image: url('${backdropUrl}'); background-size: cover; background-position: center;">
            </div>
            <div class="detail-content">
                <img class="detail-poster" src="${posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${escapeHtml(title)}">
                <h1 class="detail-title">${escapeHtml(title)} (${year || 'TBA'})</h1>
                <div class="detail-meta">
                    <span>⭐ ${rating}/10</span>
                    <span>📺 ${seasonsCount} Seasons</span>
                    <span>🎬 ${tv.first_air_date || 'Unknown'}</span>
                </div>
                <p class="detail-overview">${escapeHtml(tv.overview) || 'No overview available.'}</p>
                
                <!-- EPISODE SECTION -->
                <div class="episode-section">
                    <div class="season-selector-container">
                        <label>📺 Season:</label>
                        <select id="seasonSelector" class="season-select">
                            ${seasonOptions}
                        </select>
                    </div>
                    <div class="episode-list-container" id="episodeListContainer">
                        <div class="loading-episodes">Select a season to view episodes</div>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="watchlist-detail-btn ${inWatchlist ? 'in-watchlist' : ''}" id="watchlistFromDetail">${inWatchlist ? '⭐ In Watchlist' : '☆ Add to Watchlist'}</button>
                </div>
            </div>
        </div>
    `;
    
    // Back button
    document.getElementById('backFromDetail')?.addEventListener('click', () => {
        detailSection.style.display = 'none';
        movieSection.style.display = 'block';
        tvSection.style.display = 'block';
        if (allMovies.length) renderMovieGrid('movieGrid', allMovies.slice(0, 12), 'movie');
        if (allTvShows.length) renderMovieGrid('tvGrid', allTvShows.slice(0, 12), 'tv');
    });
    
    // Watchlist button
    document.getElementById('watchlistFromDetail')?.addEventListener('click', () => {
        const newStatus = toggleWatchlist(tv.id, type, title, tv.poster_path, year);
        const btn = document.getElementById('watchlistFromDetail');
        if (btn) {
            btn.textContent = newStatus ? '⭐ In Watchlist' : '☆ Add to Watchlist';
            if (newStatus) btn.classList.add('in-watchlist');
            else btn.classList.remove('in-watchlist');
        }
    });
    
    // Season selector
    const seasonSelect = document.getElementById('seasonSelector');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', () => {
            loadEpisodesForSeason(tv.id, parseInt(seasonSelect.value));
        });
        // Load default season (Season 1)
        loadEpisodesForSeason(tv.id, 1);
    }
}

async function loadEpisodesForSeason(tvId, seasonNum) {
    const episodeContainer = document.getElementById('episodeListContainer');
    if (!episodeContainer) return;
    
    episodeContainer.innerHTML = '<div class="loading-episodes">Loading episodes...</div>';
    
    try {
        const seasonData = await getTvSeasons(tvId, seasonNum);
        const episodes = seasonData.episodes || [];
        
        if (episodes.length === 0) {
            episodeContainer.innerHTML = '<div class="loading-episodes">No episodes available for this season</div>';
            return;
        }
        
        episodeContainer.innerHTML = `
            <div class="episode-grid">
                ${episodes.map(ep => {
                    let episodeName = ep.name;
                    if (!episodeName || episodeName.trim() === '' || episodeName === 'undefined') {
                        episodeName = `Episode ${ep.episode_number}`;
                    }
                    return `
                        <div class="episode-card" data-season="${seasonNum}" data-episode="${ep.episode_number}" data-episode-name="${escapeHtml(episodeName)}">
                            <div class="episode-number">E${ep.episode_number}</div>
                            <div class="episode-name">${escapeHtml(episodeName)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Add click listeners to episode cards
        document.querySelectorAll('.episode-card').forEach(card => {
            card.addEventListener('click', async () => {
                const season = card.dataset.season;
                const episode = card.dataset.episode;
                const episodeName = card.dataset.episode_name;
                
                const tvDetails = currentTvDetails;
                const imdbId = tvDetails?.external_ids?.imdb_id;
                const embedUrl = getTvEmbedUrl(imdbId, tvId, season, episode);
                let cleanEpisodeName = episodeName;
                if (!cleanEpisodeName || cleanEpisodeName === 'undefined') {
                    cleanEpisodeName = `Episode ${episode}`;
                }
                openPlayer(embedUrl, `${tvDetails?.name || 'TV Show'} - S${season}E${episode}: ${cleanEpisodeName}`);
                showNotification(`Now playing: ${tvDetails?.name} - Season ${season}, Episode ${episode}`);
            });
        });
        
    } catch (error) {
        console.error('Error loading episodes:', error);
        episodeContainer.innerHTML = '<div class="loading-episodes">Error loading episodes. Please try again.</div>';
    }
}

// ============================================
// PLAYER
// ============================================
function openPlayer(embedUrl, title) {
    const modal = document.getElementById('playerModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInfo = document.getElementById('modalInfo');
    const videoFrame = document.getElementById('videoFrame');
    const refreshBtn = document.getElementById('refreshPlayer');
    
    let cleanTitle = title;
    if (cleanTitle && (cleanTitle.includes('undefined') || cleanTitle === 'undefined')) {
        cleanTitle = cleanTitle.replace(': undefined', '').replace('undefined', '').trim();
        if (!cleanTitle) cleanTitle = 'Now Playing';
    }
    
    modalTitle.textContent = cleanTitle;
    modalInfo.textContent = `Now playing: ${cleanTitle}`;
    videoFrame.src = embedUrl;
    modal.classList.add('active');
    
    if (refreshBtn) {
        const newRefreshBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
        
        newRefreshBtn.addEventListener('click', () => {
            const currentSrc = videoFrame.src;
            if (currentSrc) {
                modalInfo.textContent = `🔄 Refreshing player... Please wait.`;
                videoFrame.src = '';
                setTimeout(() => {
                    videoFrame.src = currentSrc;
                    modalInfo.textContent = `Now playing: ${cleanTitle}`;
                }, 500);
            }
        });
    }
}

function closeModal() {
    const modal = document.getElementById('playerModal');
    const videoFrame = document.getElementById('videoFrame');
    modal.classList.remove('active');
    videoFrame.src = '';
}

async function playRandom() {
    const movies = await getPopularMovies();
    if (movies.length > 0) {
        const random = movies[Math.floor(Math.random() * movies.length)];
        showMovieDetail(random.id, 'movie');
    }
}

// ============================================
// NAVIGASI
// ============================================
function showAllMovies() {
    renderMovieGrid('movieGrid', allMovies, 'movie');
    document.getElementById('movieSection').style.display = 'block';
    document.getElementById('tvSection').style.display = 'none';
    document.getElementById('detailSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';
    const watchlistSection = document.getElementById('watchlistSection');
    if (watchlistSection) watchlistSection.style.display = 'none';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (document.querySelector('#navMovies')) document.querySelector('#navMovies').classList.add('active');
}

function showAllTv() {
    renderMovieGrid('tvGrid', allTvShows, 'tv');
    document.getElementById('movieSection').style.display = 'none';
    document.getElementById('tvSection').style.display = 'block';
    document.getElementById('detailSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';
    const watchlistSection = document.getElementById('watchlistSection');
    if (watchlistSection) watchlistSection.style.display = 'none';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (document.querySelector('#navTv')) document.querySelector('#navTv').classList.add('active');
}

function showHome() {
    document.getElementById('movieSection').style.display = 'block';
    document.getElementById('tvSection').style.display = 'block';
    document.getElementById('detailSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';
    const watchlistSection = document.getElementById('watchlistSection');
    if (watchlistSection) watchlistSection.style.display = 'none';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (document.querySelector('#navHome')) document.querySelector('#navHome').classList.add('active');
    
    if (allMovies.length) renderMovieGrid('movieGrid', allMovies.slice(0, 12), 'movie');
    if (allTvShows.length) renderMovieGrid('tvGrid', allTvShows.slice(0, 12), 'tv');
}

function showWatchlist() {
    renderWatchlistGrid();
    document.getElementById('movieSection').style.display = 'none';
    document.getElementById('tvSection').style.display = 'none';
    document.getElementById('detailSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';
    const watchlistSection = document.getElementById('watchlistSection');
    if (watchlistSection) watchlistSection.style.display = 'block';
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (document.querySelector('#navWatchlist')) document.querySelector('#navWatchlist').classList.add('active');
}

function closeWatchlist() {
    showHome();
}

// ============================================
// SEARCH FUNCTIONS
// ============================================
async function searchTMDB(query, type = 'multi') {
    if (!query || query.trim() === '') return [];
    try {
        const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        let results = data.results || [];
        results = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        return results;
    } catch (error) {
        console.error('Search error:', error);
        const allContent = [
            ...(allMovies || []).map(m => ({ ...m, media_type: 'movie' })),
            ...(allTvShows || []).map(t => ({ ...t, media_type: 'tv', title: t.name }))
        ];
        return allContent.filter(item => 
            (item.title || item.name || '').toLowerCase().includes(query.toLowerCase())
        );
    }
}

function renderSearchResults(results) {
    const searchGrid = document.getElementById('searchGrid');
    if (!searchGrid) return;
    
    searchGrid.innerHTML = results.slice(0, 24).map(item => {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const posterPath = item.poster_path;
        const posterUrl = posterPath ? `${IMAGE_BASE_URL}${posterPath}` : 'https://via.placeholder.com/300x450?text=No+Poster';
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const inWatchlist = isInWatchlist(item.id, mediaType);
        
        return `
            <div class="movie-card" data-id="${item.id}" data-type="${mediaType}" data-title="${escapeHtml(title)}">
                <img class="movie-poster" src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="movie-info">
                    <div class="movie-title">${escapeHtml(title)}</div>
                    <div class="movie-year">${year || 'TBA'} • ${mediaType === 'tv' ? '📺 TV' : '🎬 Movie'}</div>
                </div>
                <button class="watchlist-btn ${inWatchlist ? 'in-watchlist' : ''}" data-id="${item.id}" data-type="${mediaType}" data-title="${escapeHtml(title)}" data-poster="${posterPath || ''}" data-year="${year || ''}">⭐</button>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('#searchGrid .movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('watchlist-btn')) {
                e.stopPropagation();
                const id = e.target.dataset.id;
                const mediaType = e.target.dataset.type;
                const title = e.target.dataset.title;
                const poster = e.target.dataset.poster;
                const year = e.target.dataset.year;
                toggleWatchlist(id, mediaType, title, poster, year);
                renderSearchResults(results);
                if (document.getElementById('watchlistSection') && document.getElementById('watchlistSection').style.display === 'block') {
                    renderWatchlistGrid();
                }
                return;
            }
            const id = card.dataset.id;
            const mediaType = card.dataset.type;
            showMovieDetail(id, mediaType);
        });
    });
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value.trim();
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    
    const searchGrid = document.getElementById('searchGrid');
    const searchSection = document.getElementById('searchSection');
    const searchTitle = document.getElementById('searchTitle');
    const movieSection = document.getElementById('movieSection');
    const tvSection = document.getElementById('tvSection');
    const detailSection = document.getElementById('detailSection');
    const watchlistSection = document.getElementById('watchlistSection');
    
    if (searchGrid) searchGrid.innerHTML = '<div class="loading">🔍 Searching...</div>';
    if (searchSection) searchSection.style.display = 'block';
    if (searchTitle) searchTitle.innerHTML = `🔍 Search Results: "${escapeHtml(query)}"`;
    if (movieSection) movieSection.style.display = 'none';
    if (tvSection) tvSection.style.display = 'none';
    if (detailSection) detailSection.style.display = 'none';
    if (watchlistSection) watchlistSection.style.display = 'none';
    
    const results = await searchTMDB(query, 'multi');
    
    if (results.length === 0) {
        if (searchGrid) searchGrid.innerHTML = '<div class="loading">😔 No results found</div>';
        return;
    }
    
    renderSearchResults(results);
    addToSearchHistory(query);
}

function closeSearch() {
    document.getElementById('searchSection').style.display = 'none';
    showHome();
}

// ============================================
// SEARCH HISTORY
// ============================================
const SEARCH_STORAGE_KEY = 'grizzle_search_history';
const MAX_HISTORY = 10;

function getSearchHistory() {
    const history = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (history) {
        try {
            return JSON.parse(history);
        } catch (e) {
            return [];
        }
    }
    return [];
}

function saveSearchHistory(history) {
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function addToSearchHistory(term) {
    if (!term || term.trim() === '') return;
    term = term.trim();
    let history = getSearchHistory();
    history = history.filter(item => item !== term);
    history.unshift(term);
    saveSearchHistory(history);
}

function removeFromHistory(term) {
    let history = getSearchHistory();
    history = history.filter(item => item !== term);
    saveSearchHistory(history);
    showAutocomplete();
}

function clearAllHistory() {
    if (confirm('Clear all search history?')) {
        saveSearchHistory([]);
        const autocompleteList = document.getElementById('autocompleteList');
        if (autocompleteList) autocompleteList.style.display = 'none';
    }
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
    if (!query || query.trim() === '') return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="autocomplete-match">$1</span>');
}

function showAutocomplete() {
    const input = document.getElementById('searchInput');
    const autocompleteList = document.getElementById('autocompleteList');
    const query = input?.value.trim() || '';
    
    if (!autocompleteList) return;
    
    let history = getSearchHistory();
    let suggestions = history;
    if (query) {
        suggestions = history.filter(item => item.toLowerCase().includes(query.toLowerCase()));
    }
    
    if (suggestions.length === 0) {
        autocompleteList.style.display = 'none';
        return;
    }
    
    autocompleteList.innerHTML = suggestions.map(term => `
        <div class="autocomplete-item" data-term="${escapeHtml(term)}">
            <span class="autocomplete-term">🔍 ${highlightMatch(term, query)}</span>
            <button class="delete-item" data-term="${escapeHtml(term)}">&times;</button>
        </div>
    `).join('');
    
    autocompleteList.style.display = 'block';
    
    document.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-item')) {
                e.stopPropagation();
                const term = e.target.dataset.term;
                if (term) removeFromHistory(term);
                return;
            }
            const term = item.dataset.term;
            if (term) {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = term;
                autocompleteList.style.display = 'none';
                performSearch();
            }
        });
    });
}

function hideAutocomplete() {
    const autocompleteList = document.getElementById('autocompleteList');
    if (autocompleteList) {
        setTimeout(() => {
            autocompleteList.style.display = 'none';
        }, 200);
    }
}

function setupAutocomplete() {
    const searchInput = document.getElementById('searchInput');
    const clearAllBtn = document.getElementById('clearAllHistory');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => showAutocomplete());
        searchInput.addEventListener('focus', () => {
            if (getSearchHistory().length > 0) showAutocomplete();
        });
        searchInput.addEventListener('blur', hideAutocomplete);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const list = document.getElementById('autocompleteList');
                if (list) list.style.display = 'none';
            }
        });
    }
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllHistory);
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    const movieGrid = document.getElementById('movieGrid');
    const tvGrid = document.getElementById('tvGrid');
    
    if (movieGrid) movieGrid.innerHTML = '<div class="loading">🎬 Loading movies...</div>';
    if (tvGrid) tvGrid.innerHTML = '<div class="loading">📺 Loading TV shows...</div>';
    
    const movies = await getPopularMovies();
    renderMovieGrid('movieGrid', movies.slice(0, 12), 'movie');
    
    const tvShows = await getPopularTv();
    renderMovieGrid('tvGrid', tvShows.slice(0, 12), 'tv');
    
    initTheme();
    requestNotificationPermission();
    
    document.getElementById('trendingBtn')?.addEventListener('click', async () => {
        if (movieGrid) movieGrid.innerHTML = '<div class="loading">🔥 Loading trending...</div>';
        const trending = await getTrendingMovies();
        renderMovieGrid('movieGrid', trending.slice(0, 12), 'movie');
    });
    
    document.getElementById('randomBtn')?.addEventListener('click', playRandom);
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('navHome')?.addEventListener('click', showHome);
    document.getElementById('navMovies')?.addEventListener('click', showAllMovies);
    document.getElementById('navTv')?.addEventListener('click', showAllTv);
    document.getElementById('navWatchlist')?.addEventListener('click', showWatchlist);
    document.getElementById('closeWatchlist')?.addEventListener('click', closeWatchlist);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('viewAllMovies')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAllMovies();
    });
    document.getElementById('viewAllTv')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAllTv();
    });
    
    const playerModal = document.getElementById('playerModal');
    if (playerModal) {
        playerModal.addEventListener('click', (e) => {
            if (e.target === playerModal) closeModal();
        });
    }
    
    const searchBtn = document.getElementById('searchBtn');
    const closeSearchBtn = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    setupAutocomplete();
}
// ============================================
// SCRAP TMDB CODES FEATURE
// ============================================

let scrapData = [];

async function validateTMDBId(tmdbId, type = 'movie') {
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return { valid: true, title: data.title || data.name };
        }
        return { valid: false, error: `HTTP ${response.status}` };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

async function scrapWatchlistCodes() {
    const watchlist = getWatchlist();
    const tbody = document.getElementById('scrapTableBody');
    const container = document.getElementById('scrapTableContainer');
    
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading">🔄 Fetching TMDB data...</td></tr>';
    container.style.display = 'block';
    
    scrapData = [];
    
    for (let i = 0; i < watchlist.length; i++) {
        const item = watchlist[i];
        const tmdbId = item.id;
        const type = item.type;
        
        // Update row status
        tbody.innerHTML = scrapData.map((data, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(data.title)}</td>
                <td><span class="tmdb-code" data-code="${data.tmdbId}">${data.tmdbId}</span></td>
                <td><span class="relay-badge relay-${data.relay === 'angka' ? 'angka' : (data.relay === 'tt' ? 'tt' : 'imdb')}">${data.relay}</span></td>
                <td>${data.valid ? '<span class="badge-valid">✅ Valid</span>' : '<span class="badge-invalid">❌ Invalid</span>'}</td>
                <td><a href="#" class="test-link" data-id="${data.tmdbId}" data-type="${type}" data-relay="${data.relay}">🔗 Test Embed</a></td>
            </tr>
        `).join('');
        
        // Add loading row for current item
        tbody.innerHTML += `
            <tr id="loading-row-${i}">
                <td colspan="6" class="loading">Checking: ${escapeHtml(item.title)}...</td>
            </tr>
        `;
        
        // Validate TMDB ID
        const validation = await validateTMDBId(tmdbId, type);
        
        // Determine relay type
        let relay = 'angka';
        // Simple heuristic: if title contains special pattern or ID is less than 10000, might need tt
        // For now, default to 'angka' as most embed servers use TMDB ID directly
        if (tmdbId < 10000 && type === 'movie') {
            relay = 'tt'; // Older movies might need tt prefix
        }
        
        const rowData = {
            no: i + 1,
            title: validation.title || item.title,
            tmdbId: tmdbId,
            relay: relay,
            valid: validation.valid,
            type: type
        };
        
        scrapData.push(rowData);
        
        // Remove loading row and add actual data
        const loadingRow = document.getElementById(`loading-row-${i}`);
        if (loadingRow) loadingRow.remove();
        
        tbody.innerHTML = scrapData.map((data, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(data.title)}</td>
                <td><span class="tmdb-code" data-code="${data.tmdbId}">${data.tmdbId}</span></td>
                <td><span class="relay-badge relay-${data.relay === 'angka' ? 'angka' : (data.relay === 'tt' ? 'tt' : 'imdb')}">${data.relay}</span></td>
                <td>${data.valid ? '<span class="badge-valid">✅ Valid</span>' : '<span class="badge-invalid">❌ Invalid</span>'}</td>
                <td><a href="#" class="test-link" data-id="${data.tmdbId}" data-type="${data.type}" data-relay="${data.relay}">🔗 Test Embed</a></td>
            </tr>
        `).join('');
    }
    
    // Attach copy event listeners
    document.querySelectorAll('.tmdb-code').forEach(el => {
        el.addEventListener('click', async (e) => {
            const code = el.dataset.code;
            await navigator.clipboard.writeText(code);
            showCopyNotification(`Copied: ${code}`);
        });
    });
    
    // Attach test embed event listeners
    document.querySelectorAll('.test-link').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = el.dataset.id;
            const type = el.dataset.type;
            const relay = el.dataset.relay;
            
            if (type === 'movie') {
                const embedUrl = getMovieEmbedUrl(null, id);
                openPlayer(embedUrl, `Test Movie ID: ${id}`);
            } else {
                // For TV, test with season 1 episode 1
                let finalId = id;
                if (relay === 'tt' && !id.toString().startsWith('tt')) {
                    finalId = `tt${id}`;
                }
                const embedUrl = getTvEmbedUrl(null, finalId, 1, 1);
                openPlayer(embedUrl, `Test TV ID: ${id} - S01E01`);
            }
        });
    });
}

function showCopyNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function exportToCSV() {
    if (scrapData.length === 0) {
        alert('No data to export. Run Scrap TMDB Codes first.');
        return;
    }
    
    const headers = ['NO', 'Movie Title', 'TMDB Codes', 'Relay', 'Valid ID'];
    const rows = scrapData.map(item => [
        item.no,
        item.title,
        item.tmdbId,
        item.relay,
        item.valid ? 'Valid' : 'Invalid'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grizzle_watchlist_codes_${new Date().toISOString().slice(0,19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showCopyNotification('CSV exported!');
}

function exportToJSON() {
    if (scrapData.length === 0) {
        alert('No data to export. Run Scrap TMDB Codes first.');
        return;
    }
    
    const exportData = scrapData.map(item => ({
        no: item.no,
        title: item.title,
        tmdb_id: item.tmdbId,
        relay: item.relay,
        valid: item.valid,
        type: item.type
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grizzle_watchlist_codes_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showCopyNotification('JSON exported!');
}

function closeScrapTable() {
    const container = document.getElementById('scrapTableContainer');
    if (container) container.style.display = 'none';
    scrapData = [];
}

// Tambahkan event listener untuk tombol scrap di init()
// Cari fungsi init() dan tambahkan di dalamnya:
// document.getElementById('scrapCodesBtn')?.addEventListener('click', scrapWatchlistCodes);
// document.getElementById('exportCSVBtn')?.addEventListener('click', exportToCSV);
// document.getElementById('exportJSONBtn')?.addEventListener('click', exportToJSON);
// document.getElementById('closeScrapTable')?.addEventListener('click', closeScrapTable);

// Scrap TMDB Codes buttons
document.getElementById('scrapCodesBtn')?.addEventListener('click', scrapWatchlistCodes);
document.getElementById('exportCSVBtn')?.addEventListener('click', exportToCSV);
document.getElementById('exportJSONBtn')?.addEventListener('click', exportToJSON);
document.getElementById('closeScrapTable')?.addEventListener('click', closeScrapTable);
// Start the app
init();