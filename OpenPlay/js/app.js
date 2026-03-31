/* ============================================================
   GameVault - Application Logic
   ============================================================ */

(function() {
    "use strict";

    // State
    let currentType = "all";   // "all", "jeu", "app"
    let currentGenre = "Tous";
    let searchQuery = "";
    let currentPage = 1;
    const PER_PAGE = 24;
    let dlCount = 0;

    // DOM refs
    const $grid     = document.getElementById("grid");
    const $filters  = document.getElementById("filters");
    const $search   = document.getElementById("searchInput");
    const $title    = document.getElementById("title");
    const $count    = document.getElementById("count");
    const $total    = document.getElementById("totalCount");
    const $dl       = document.getElementById("dlCount");
    const $pag      = document.getElementById("pagination");
    const $scrollBtn= document.getElementById("scrollTop");

    // Init counters
    $total.textContent = DATA.length;
    $dl.textContent = "0";

    // ---- TYPE BUTTONS ----
    document.querySelectorAll(".tbtn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            currentType = this.dataset.type;
            currentGenre = "Tous";
            currentPage = 1;
            document.querySelectorAll(".tbtn").forEach(function(b) { b.classList.remove("on"); });
            this.classList.add("on");
            renderFilters();
            renderGrid();
        });
    });

    // ---- GENRES ----
    function getGenres() {
        var items = DATA;
        if (currentType !== "all") {
            items = items.filter(function(d) { return d.type === currentType; });
        }
        var set = {};
        items.forEach(function(d) { set[d.genre] = true; });
        return ["Tous"].concat(Object.keys(set).sort());
    }

    function renderFilters() {
        var genres = getGenres();
        $filters.innerHTML = genres.map(function(g) {
            return '<button class="fbtn' + (g === currentGenre ? ' on' : '') + '" data-g="' + g + '">' + g + '</button>';
        }).join("");

        $filters.querySelectorAll(".fbtn").forEach(function(btn) {
            btn.addEventListener("click", function() {
                currentGenre = this.dataset.g;
                currentPage = 1;
                renderFilters();
                renderGrid();
            });
        });
    }

    // ---- FILTERED DATA ----
    function getFiltered() {
        var items = DATA;

        if (currentType !== "all") {
            items = items.filter(function(d) { return d.type === currentType; });
        }

        if (currentGenre !== "Tous") {
            items = items.filter(function(d) { return d.genre === currentGenre; });
        }

        if (searchQuery) {
            var q = searchQuery.toLowerCase();
            items = items.filter(function(d) {
                return d.name.toLowerCase().indexOf(q) !== -1 ||
                       d.genre.toLowerCase().indexOf(q) !== -1 ||
                       d.desc.toLowerCase().indexOf(q) !== -1;
            });
        }

        return items;
    }

    // ---- IMAGE FALLBACK ----
    window.onImgErr = function(img) {
        img.style.display = "none";
        var fb = img.parentElement.querySelector(".fallback");
        if (fb) fb.style.display = "flex";
    };

    // ---- RENDER GRID ----
    function renderGrid() {
        var items = getFiltered();
        var total = items.length;
        var totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * PER_PAGE;
        var pageItems = items.slice(start, start + PER_PAGE);

        // Title & count
        var typeLabel = currentType === "jeu" ? "Jeux" : currentType === "app" ? "Applications" : "Tous";
        $title.textContent = currentGenre === "Tous" ? typeLabel : currentGenre;
        $count.textContent = total + " resultat" + (total !== 1 ? "s" : "");

        // No results
        if (!pageItems.length) {
            $grid.innerHTML = '<div class="no-res"><div class="e">&#128533;</div><p>Aucun resultat</p></div>';
            $pag.innerHTML = "";
            return;
        }

        // Cards
        $grid.innerHTML = pageItems.map(function(item, i) {
            var hasImg = item.img && item.img.length > 0;
            var imgHtml = hasImg
                ? '<img src="' + item.img + '" alt="' + item.name + '" loading="lazy" onerror="onImgErr(this)">' +
                  '<div class="fallback" style="display:none;background:' + item.color + '">' + item.icon + '</div>'
                : '<div class="fallback" style="background:' + item.color + '">' + item.icon + '</div>';

            return '<div class="card" style="animation-delay:' + (i * 0.03) + 's">' +
                '<div class="card-img">' +
                    imgHtml +
                    '<span class="badge ' + (item.type === "jeu" ? "badge-jeu" : "badge-app") + '">' +
                        (item.type === "jeu" ? "Jeu" : "App") +
                    '</span>' +
                    '<span class="card-rating">&#11088; ' + item.rate + '</span>' +
                '</div>' +
                '<div class="card-over">' +
                    '<h3>' + item.name + '</h3>' +
                    '<div class="gtag">' + item.genre + ' &bull; ' + (item.type === "jeu" ? "Jeu" : "Application") + '</div>' +
                    '<div class="desc">' + item.desc + '</div>' +
                    '<div class="meta">' +
                        '<span>&#128230; ' + item.size + '</span>' +
                        '<span>v' + item.ver + '</span>' +
                        '<span>' + item.plat + '</span>' +
                    '</div>' +
                    '<a href="' + item.dl + '" target="_blank" rel="noopener noreferrer" class="dl-btn" onclick="event.stopPropagation();countDl();">' +
                        '&#11015; Telecharger' +
                    '</a>' +
                '</div>' +
                '<div class="card-bot">' +
                    '<span class="card-name">' + item.name + '</span>' +
                    '<span class="card-genre">' + item.genre + '</span>' +
                '</div>' +
            '</div>';
        }).join("");

        // Pagination
        renderPagination(totalPages);
    }

    // ---- PAGINATION ----
    function renderPagination(totalPages) {
        if (totalPages <= 1) {
            $pag.innerHTML = "";
            return;
        }

        var html = "";

        // Prev
        html += '<button class="pgbtn" data-p="prev"' + (currentPage === 1 ? ' disabled' : '') + '>&laquo;</button>';

        // Page numbers (show max 7 pages around current)
        var startP = Math.max(1, currentPage - 3);
        var endP = Math.min(totalPages, startP + 6);
        if (endP - startP < 6) startP = Math.max(1, endP - 6);

        if (startP > 1) {
            html += '<button class="pgbtn" data-p="1">1</button>';
            if (startP > 2) html += '<span class="pgbtn" style="border:none;cursor:default">...</span>';
        }

        for (var p = startP; p <= endP; p++) {
            html += '<button class="pgbtn' + (p === currentPage ? ' on' : '') + '" data-p="' + p + '">' + p + '</button>';
        }

        if (endP < totalPages) {
            if (endP < totalPages - 1) html += '<span class="pgbtn" style="border:none;cursor:default">...</span>';
            html += '<button class="pgbtn" data-p="' + totalPages + '">' + totalPages + '</button>';
        }

        // Next
        html += '<button class="pgbtn" data-p="next"' + (currentPage === totalPages ? ' disabled' : '') + '>&raquo;</button>';

        $pag.innerHTML = html;

        $pag.querySelectorAll(".pgbtn[data-p]").forEach(function(btn) {
            btn.addEventListener("click", function() {
                var val = this.dataset.p;
                if (val === "prev") {
                    if (currentPage > 1) currentPage--;
                } else if (val === "next") {
                    if (currentPage < totalPages) currentPage++;
                } else {
                    currentPage = parseInt(val);
                }
                renderGrid();
                window.scrollTo({ top: $grid.offsetTop - 100, behavior: "smooth" });
            });
        });
    }

    // ---- DOWNLOAD COUNTER ----
    window.countDl = function() {
        dlCount++;
        $dl.textContent = dlCount;
    };

    // ---- SEARCH ----
    var searchTimer;
    $search.addEventListener("input", function() {
        clearTimeout(searchTimer);
        var val = this.value;
        searchTimer = setTimeout(function() {
            searchQuery = val.trim();
            currentPage = 1;
            renderGrid();
        }, 250);
    });

    // ---- SCROLL TO TOP ----
    window.addEventListener("scroll", function() {
        if (window.scrollY > 400) {
            $scrollBtn.classList.add("show");
        } else {
            $scrollBtn.classList.remove("show");
        }
    });

    $scrollBtn.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // ---- INIT ----
    renderFilters();
    renderGrid();

})();
