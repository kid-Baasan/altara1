  // Hero video — the markup already has autoplay/muted/playsinline, which
  // covers most mobile browsers, but some (older Android WebViews, in-app
  // browsers like Facebook/Instagram) still won't autoplay without an
  // explicit .play() call, or need the `muted` property set in JS rather
  // than just the HTML attribute. This makes sure it actually starts, and
  // retries once on the first touch/click if the initial attempt was
  // blocked.
  (function(){
    var video = document.querySelector('.hero-video');
    if(!video) return;
    video.muted = true;
    function tryPlay(){
      var p = video.play();
      if(p && p.catch) p.catch(function(){});
    }
    tryPlay();
    document.addEventListener('touchstart', tryPlay, { once: true, passive: true });
    document.addEventListener('click', tryPlay, { once: true });
  })();

  // Header scroll state — two independent concerns toggled off the same
  // scroll position: .scrolled (background/logo swap, unchanged) and
  // .header-hidden (slide the whole header off-screen on scroll-down,
  // slide it back in on scroll-up, styled in style.css). Direction is
  // read straight off the raw scroll delta each tick rather than a
  // separate listener, so the two states never disagree about where the
  // page actually is.
  (function(){
    var header = document.getElementById('siteHeader');
    var logo = document.getElementById('siteLogo');
    var mobileNav = document.getElementById('mobileNav');
    var isScrolled = false;
    var isHidden = false;
    var lastY = window.scrollY;
    var ticking = false;
    // Below this, always keep the header visible — avoids hiding it
    // right at the top of the page (where a hairline scroll jitter could
    // otherwise flicker it) and gives a small dead zone before scroll-down
    // hiding kicks in at all.
    var REVEAL_ZONE = 120;
    // Ignore sub-pixel/momentum jitter so a barely-there scroll doesn't
    // toggle the header back and forth.
    var DELTA_THRESHOLD = 6;

    function update(){
      var y = window.scrollY;
      var scrolled = y > 60;
      if(scrolled !== isScrolled){
        isScrolled = scrolled;
        header.classList.toggle('scrolled', scrolled);
        logo.src = scrolled ? '/assets/images/logo/logo.svg' : '/assets/images/logo/logo-white.svg';
      }

      // Never hide the header while the mobile nav panel is open (its own
      // close button lives inside the header) or while it's already
      // sitting in the top dead zone.
      var mobileNavOpen = mobileNav && mobileNav.classList.contains('is-open');
      var delta = y - lastY;
      var shouldHide = isHidden;
      if(mobileNavOpen || y <= REVEAL_ZONE){
        shouldHide = false;
      } else if(delta > DELTA_THRESHOLD){
        shouldHide = true;
      } else if(delta < -DELTA_THRESHOLD){
        shouldHide = false;
      }
      if(shouldHide !== isHidden){
        isHidden = shouldHide;
        header.classList.toggle('header-hidden', isHidden);
      }

      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function(){
      if(!ticking){ window.requestAnimationFrame(update); ticking = true; }
    });
    // Run once on load too, not just on the next scroll event — otherwise
    // a page that loads already scrolled (mobile back/forward navigation,
    // bfcache restores, or landing on an in-page anchor like #enquire)
    // keeps the transparent/white-text "top of page" header state until
    // the user scrolls again, even while sitting over a light-background
    // section further down the page.
    update();
  })();

  // Generic horizontal card slider — scroll-snap track + prev/next arrows.
  // Shared by the Journeys slider and the Activities slider (same
  // scrollBy-one-card-width technique, different ids/card class). Pass
  // loop:true (Activities) to have the arrows wrap around at either end
  // instead of disabling/fading out — Journeys stays a finite strip.
  function initCardSlider(trackId, prevId, nextId, cardClass, loop){
    var track = document.getElementById(trackId);
    var prevBtn = document.getElementById(prevId);
    var nextBtn = document.getElementById(nextId);
    if(!track || !prevBtn || !nextBtn) return;

    function cardStep(){
      var card = track.querySelector('.' + cardClass);
      if(!card) return 320;
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 22);
      return card.getBoundingClientRect().width + gap;
    }

    function maxScroll(){
      return track.scrollWidth - track.clientWidth - 2;
    }

    function updateArrows(){
      if(loop) return; // arrows never disable/fade for a looping slider
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= maxScroll();
    }

    prevBtn.addEventListener('click', function(){
      if(loop && track.scrollLeft <= 0){
        track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
      }
    });
    nextBtn.addEventListener('click', function(){
      if(loop && track.scrollLeft >= maxScroll()){
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: cardStep(), behavior: 'smooth' });
      }
    });
    track.addEventListener('scroll', function(){
      window.requestAnimationFrame(updateArrows);
    });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }
  initCardSlider('journeyTrack', 'journeyPrev', 'journeyNext', 'journey-card');
  initCardSlider('activityTrack', 'activityPrev', 'activityNext', 'activity-card', true);
  initCardSlider('tourGalleryTrack', 'tourGalleryPrev', 'tourGalleryNext', 'tour-gallery-slide');
  initCardSlider('blogTrack', 'blogPrev', 'blogNext', 'blog-card');
  initCardSlider('relatedToursTrack', 'relatedToursPrev', 'relatedToursNext', 'tour-card');

  // Related Tours slider — click-and-drag with a mouse, same pattern the
  // Activities slider uses below (.is-dragging swaps the cursor to
  // "grabbing"; a suppressed click after a real drag stops the dragged
  // card's own link from firing), just without that slider's autoplay.
  (function(){
    var track = document.getElementById('relatedToursTrack');
    if(!track) return;
    var isDown = false, dragged = false, startX = 0, startScroll = 0;
    track.addEventListener('mousedown', function(e){
      isDown = true;
      dragged = false;
      startX = e.pageX;
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('mousemove', function(e){
      if(!isDown) return;
      var dx = e.pageX - startX;
      if(Math.abs(dx) > 4) dragged = true;
      track.scrollLeft = startScroll - dx;
    });
    window.addEventListener('mouseup', function(){
      if(!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
    });
    track.addEventListener('click', function(e){
      if(dragged){ e.preventDefault(); dragged = false; }
    }, true);
  })();

  // Activities slider — auto-advances on its own, marking whichever card is
  // currently snapped into view as "active" (which is what reveals its
  // description — see .activity-info p in style.css). Hovering the slider
  // pauses the autoplay, so a manual look never gets interrupted by a slide.
  // Also click-and-drag (mouse) scrollable, same as a touch swipe.
  (function(){
    var track = document.getElementById('activityTrack');
    var slider = document.querySelector('.activities-slider');
    if(!track || !slider) return;
    var cards = Array.prototype.slice.call(track.querySelectorAll('.activity-card'));
    if(!cards.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = null;

    function cardStep(){
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 6);
      return cards[0].getBoundingClientRect().width + gap;
    }

    function syncActive(){
      var i = Math.round(track.scrollLeft / cardStep());
      cards.forEach(function(card, ci){ card.classList.toggle('is-active', ci === i); });
    }

    function advance(){
      var step = cardStep();
      var i = Math.round(track.scrollLeft / step);
      var next = i + 1 >= cards.length ? 0 : i + 1;
      track.scrollTo({ left: next * step, behavior: 'smooth' });
    }

    function start(){
      if(reduced || timer) return;
      timer = setInterval(advance, 4200);
    }
    function stop(){
      clearInterval(timer);
      timer = null;
    }

    track.addEventListener('scroll', function(){
      window.requestAnimationFrame(syncActive);
    });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('touchstart', stop, { passive: true });

    // Click-and-drag with a mouse. .is-dragging swaps the cursor to
    // "grabbing" (see style.css); a suppressed click after a real drag
    // stops the card's own link from firing.
    var isDown = false, dragged = false, startX = 0, startScroll = 0;
    track.addEventListener('mousedown', function(e){
      isDown = true;
      dragged = false;
      startX = e.pageX;
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
      stop();
    });
    window.addEventListener('mousemove', function(e){
      if(!isDown) return;
      var dx = e.pageX - startX;
      if(Math.abs(dx) > 4) dragged = true;
      track.scrollLeft = startScroll - dx;
    });
    window.addEventListener('mouseup', function(){
      if(!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
      start();
    });
    track.addEventListener('click', function(e){
      if(dragged){ e.preventDefault(); dragged = false; }
    }, true);

    syncActive();
    start();
  })();

  // Explore Bhutan — interactive map
  (function(){
    var svg = document.getElementById('bhutan-svg');
    if(!svg) return;

    var tooltip = document.getElementById('map-tooltip');
    var tooltipName = document.getElementById('map-tooltip-name');
    var tooltipDesc = document.getElementById('map-tooltip-desc');

    // District data — names match the SVG "title" attributes exactly
    var DISTRICT_DATA = [
      { name: "Ha",               desc: "Remote western valley preserving ancient Bon culture and pristine alpine landscapes." },
      { name: "Samtse",           desc: "Southernmost district bordering India, rich in subtropical wildlife and tea gardens." },
      { name: "Paro",             desc: "Home to Bhutan's only international airport and the revered Tiger's Nest monastery." },
      { name: "Chhukha",          desc: "Gateway district with iconic hydropower dams, dramatic river gorges and Phuentsholing." },
      { name: "Thimphu",          desc: "Capital district nestled in the Wang Chhu valley, home to the Tashichho Dzong." },
      { name: "Gasa",             desc: "Sparsely populated northern district of high-altitude meadows and hot springs." },
      { name: "Punakha",          desc: "Former winter capital, home to Punakha Dzong at the confluence of two rivers." },
      { name: "Dagana",           desc: "Subtropical southern district of lush forests and a hilltop dzong." },
      { name: "Wangdue Phodrang", desc: "Central district known for its dramatic dzong perched above the Punak Tsang Chhu." },
      { name: "Tsirang",          desc: "Small fertile district of terraced farms, citrus groves and warm southern valleys." },
      { name: "Sarpang",          desc: "Southern lowland district with Royal Manas National Park and rich biodiversity." },
      { name: "Trongsa",          desc: "Strategic highland district where Trongsa Dzong commands the east-west highway." },
      { name: "Bumthang",         desc: "Spiritual heartland with ancient temples, buckwheat valleys and apple orchards." },
      { name: "Zhemgang",         desc: "Remote central district of dense forests, wildlife corridors and raven lore." },
      { name: "Lhuentse",         desc: "Northern ancestral homeland of the royal family, above the Kuri Chhu gorge." },
      { name: "Monggar",          desc: "Eastern crossroads town surrounded by steep forested slopes and terraced farmland." },
      { name: "Pemagatshel",      desc: "Serene eastern district of pine forests, rolling hills and vibrant local crafts." },
      { name: "Trashigang",       desc: "Largest eastern district and cultural hub with the iconic Trashigang Dzong." },
      { name: "Samdrup Jongkha",  desc: "Southeastern gateway district bordering Assam with lowland subtropical forests." },
      { name: "Trashi Yangtse",   desc: "Far-eastern district where the rare black-necked crane winters in Bumdeling valley." }
    ];

    // Match each SVG path to its district data by "title" attribute
    function matchDistricts(){
      var paths = svg.querySelectorAll('.district');
      var byName = {};
      DISTRICT_DATA.forEach(function(d){ byName[d.name] = d; });
      var pairs = [];
      paths.forEach(function(path){
        var d = byName[path.getAttribute('title')];
        if(d) pairs.push([path, d]);
      });
      return pairs;
    }

    // A handful of district labels sit directly under the flight-route
    // arcs and get visually crossed by them — nudge just those away from
    // their district's centroid so the dashed lines stay clear of the text.
    var LABEL_NUDGE = {
      "Paro":              { dx: -8,  dy: -10 },
      "Thimphu":           { dx: 10,  dy: 11 },
      "Punakha":           { dx: -11, dy: -6 },
      "Wangdue Phodrang":  { dx: 0,   dy: 15 },
      "Trongsa":           { dx: 0,   dy: -11 },
      "Bumthang":          { dx: -16, dy: 8 },
      "Sarpang":           { dx: 16,  dy: 9 },
      "Mongar":            { dx: 0,   dy: 13 },
      "Trashigang":        { dx: -16, dy: 7 }
    };

    // Centered text label inside each district shape
    function addMapLabels(pairs){
      var g = document.getElementById('labels-group');
      pairs.forEach(function(pair){
        var pathEl = pair[0], d = pair[1];
        var bb = pathEl.getBBox();
        var nudge = LABEL_NUDGE[d.name];
        var cx = bb.x + bb.width / 2 + (nudge ? nudge.dx : 0);
        var cy = bb.y + bb.height / 2 + (nudge ? nudge.dy : 0);
        var words = d.name.split(' ');
        var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('class', 'district-label');
        txt.setAttribute('x', cx); txt.setAttribute('y', cy);
        if(words.length === 1){
          txt.textContent = d.name;
        } else {
          var lh = 8, sy = cy - (words.length - 1) * lh / 2;
          words.forEach(function(w, i){
            var ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.setAttribute('x', cx); ts.setAttribute('y', sy + i * lh);
            ts.textContent = w; txt.appendChild(ts);
          });
        }
        g.appendChild(txt);
      });
    }

    function positionTooltip(cx, cy){
      var TW = tooltip.offsetWidth || 240;
      var TH = tooltip.offsetHeight || 80;
      var OFFSET = 18;
      var VW = window.innerWidth;
      var left = Math.max(TW / 2 + 8, Math.min(cx, VW - TW / 2 - 8));
      var top = cy - TH - OFFSET;
      if(top < 8) top = cy + OFFSET;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    // District interactions — hover only swaps the fill color (.active,
    // handled entirely in CSS via .district:hover/.active); the
    // name+description tooltip no longer opens on hover, only on click/tap,
    // so a visitor has to deliberately ask for the description instead of
    // it popping up on every mouse pass over the map. Clicking the
    // currently-open district again, or clicking anywhere outside the map,
    // closes it.
    function wireMapInteractions(pairs){
      var openPath = null;

      function closeTooltip(){
        if(openPath) openPath.classList.remove('active');
        openPath = null;
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
      }

      pairs.forEach(function(pair){
        var pathEl = pair[0], d = pair[1];
        pathEl.addEventListener('click', function(e){
          e.stopPropagation();
          if(openPath === pathEl){ closeTooltip(); return; }
          if(openPath) openPath.classList.remove('active');
          openPath = pathEl;
          pathEl.classList.add('active');
          tooltipName.textContent = d.name;
          tooltipDesc.textContent = d.desc;
          positionTooltip(e.clientX, e.clientY);
          tooltip.classList.add('visible');
          tooltip.setAttribute('aria-hidden', 'false');
        });
      });

      document.addEventListener('click', closeTooltip);
      // The tooltip is positioned at the click point (position:fixed,
      // viewport coordinates) rather than pinned to its district, so it
      // visibly detaches from the map the moment the page scrolls even a
      // little — close it on the very next scroll tick instead of leaving
      // it stranded on screen until another click happens.
      window.addEventListener('scroll', closeTooltip, { passive: true });
    }

    // Domestic flight routes — Paro is Bhutan's only international airport;
    // all domestic flights originate there. Animated in on scroll.
    var FLIGHT_ROUTES = [
      { to: "Bumthang",   code: "BUT", label: "Bathpalathang Airport" },
      { to: "Sarpang",    code: "GLU", label: "Gelephu Airport" },
      { to: "Trashigang", code: "YON", label: "Yonphula Airport" }
    ];

    function districtCentroid(pairs, name){
      var match = null;
      pairs.forEach(function(p){ if(p[1].name === name) match = p[0]; });
      if(!match) return null;
      var bb = match.getBBox();
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    }

    // Build the flight paths + plane + airport markers once district shapes exist
    function buildFlightRoutes(pairs){
      var svgNS = 'http://www.w3.org/2000/svg';
      var group = document.getElementById('flight-routes-group');
      var hub = group && districtCentroid(pairs, 'Paro');
      if(!group || !hub) return [];

      var hubMarker = document.createElementNS(svgNS, 'g');
      hubMarker.innerHTML =
        '<circle class="airport-hub-ring" cx="' + hub.x + '" cy="' + hub.y + '" r="3"></circle>' +
        '<circle class="airport-hub-dot" cx="' + hub.x + '" cy="' + hub.y + '" r="2.4"></circle>';
      group.appendChild(hubMarker);

      var routes = [];

      // International arrival — a line drawn in from just outside Bhutan's
      // outline (the empty sky area at the top of the map) landing at
      // Paro, Bhutan's only international airport. Plays first, before
      // the domestic departures below.
      var intlOrigin = { x: hub.x - 28, y: -24 };
      var intlPath = document.createElementNS(svgNS, 'path');
      intlPath.setAttribute('class', 'flight-path intl-flight-path');
      intlPath.setAttribute('d', 'M ' + intlOrigin.x + ',' + intlOrigin.y + ' Q ' + (intlOrigin.x + (hub.x - intlOrigin.x) * 0.5 - 10) + ',' + (intlOrigin.y + (hub.y - intlOrigin.y) * 0.5) + ' ' + hub.x + ',' + hub.y);
      group.appendChild(intlPath);
      var intlLen = intlPath.getTotalLength();
      intlPath.style.strokeDasharray = intlLen;
      intlPath.style.strokeDashoffset = intlLen;

      var intlPlane = document.createElementNS(svgNS, 'path');
      intlPlane.setAttribute('class', 'plane-icon');
      intlPlane.setAttribute('d', 'M -5,-2.6 L 6,0 L -5,2.6 L -2.4,0 Z');
      group.appendChild(intlPlane);

      var intlOriginDot = document.createElementNS(svgNS, 'circle');
      intlOriginDot.setAttribute('class', 'intl-origin-dot');
      intlOriginDot.setAttribute('cx', intlOrigin.x);
      intlOriginDot.setAttribute('cy', intlOrigin.y);
      intlOriginDot.setAttribute('r', 2);
      group.appendChild(intlOriginDot);

      var intlTitle = document.createElementNS(svgNS, 'text');
      intlTitle.setAttribute('class', 'intl-label-title');
      intlTitle.setAttribute('x', intlOrigin.x + 9);
      intlTitle.setAttribute('y', intlOrigin.y + 2);
      intlTitle.textContent = 'International Flights';
      group.appendChild(intlTitle);

      var intlSubtitle = document.createElementNS(svgNS, 'text');
      intlSubtitle.setAttribute('class', 'intl-label-subtitle');
      intlSubtitle.setAttribute('x', intlOrigin.x + 9);
      intlSubtitle.setAttribute('y', intlOrigin.y + 11);
      intlSubtitle.textContent = 'DEL · KTM · BKK · SIN · DAC';
      group.appendChild(intlSubtitle);

      routes.push({
        pathEl: intlPath,
        planeEl: intlPlane,
        len: intlLen,
        startAt: 0,
        endAt: 0.3,
        labelEls: [intlOriginDot, intlTitle, intlSubtitle]
      });

      FLIGHT_ROUTES.forEach(function(r, i){
        var dest = districtCentroid(pairs, r.to);
        if(!dest) return;

        var mx = (hub.x + dest.x) / 2;
        var my = (hub.y + dest.y) / 2;
        var dist = Math.hypot(dest.x - hub.x, dest.y - hub.y);
        var ctrlY = my - dist * 0.22;

        var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('class', 'flight-path');
        pathEl.setAttribute('d', 'M ' + hub.x + ',' + hub.y + ' Q ' + mx + ',' + ctrlY + ' ' + dest.x + ',' + dest.y);
        group.appendChild(pathEl);
        var len = pathEl.getTotalLength();
        pathEl.style.strokeDasharray = len;
        pathEl.style.strokeDashoffset = len;

        var planeEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        planeEl.setAttribute('class', 'plane-icon');
        planeEl.setAttribute('d', 'M -5,-2.6 L 6,0 L -5,2.6 L -2.4,0 Z');
        group.appendChild(planeEl);

        var destMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        destMarker.setAttribute('class', 'airport-marker');
        destMarker.setAttribute('cx', dest.x);
        destMarker.setAttribute('cy', dest.y);
        destMarker.setAttribute('r', 2.6);
        group.appendChild(destMarker);

        var codeEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        codeEl.setAttribute('class', 'airport-code');
        codeEl.setAttribute('x', dest.x);
        codeEl.setAttribute('y', dest.y - 7);
        codeEl.textContent = r.code;
        group.appendChild(codeEl);

        routes.push({
          pathEl: pathEl,
          planeEl: planeEl,
          destMarker: destMarker,
          codeEl: codeEl,
          len: len,
          // Kept within [0,1] even for the last route — endAt must never
          // exceed 1, or that route's flight can never fully land.
          startAt: 0.28 + i * 0.14,
          endAt: 0.70 + i * 0.14
        });
      });
      return routes;
    }

    // Land border gates — where a traveler can enter/exit Bhutan by road,
    // shown as small markers along the southern edge of each district,
    // revealed after the flights have played out.
    var BORDER_GATES = [
      { district: "Chhukha",          title: "Phuentsholing",   subtitle: "(entry/exit) By Road" },
      { district: "Sarpang",          title: "Gelephu",         subtitle: "(entry/exit) By Road" },
      { district: "Samdrup Jongkha",  title: "Indo-Bhutan Gate", subtitle: "(entry/exit) By Road" }
    ];

    function buildBorderGates(pairs){
      var svgNS = 'http://www.w3.org/2000/svg';
      var group = document.getElementById('border-gates-group');
      if(!group) return [];

      var items = [];
      BORDER_GATES.forEach(function(gate){
        var match = null;
        pairs.forEach(function(p){ if(p[1].name === gate.district) match = p[0]; });
        if(!match) return;

        var bb = match.getBBox();
        var x = bb.x + bb.width / 2;
        var iconY = bb.y + bb.height - 8;
        var labelY1 = 432;
        var labelY2 = 443;

        var wrap = document.createElementNS(svgNS, 'g');
        wrap.setAttribute('class', 'border-gate');

        var line = document.createElementNS(svgNS, 'line');
        line.setAttribute('class', 'gate-line');
        line.setAttribute('x1', x); line.setAttribute('y1', iconY + 8);
        line.setAttribute('x2', x); line.setAttribute('y2', labelY1 - 9);
        wrap.appendChild(line);

        var icon = document.createElementNS(svgNS, 'g');
        icon.setAttribute('transform', 'translate(' + x + ',' + iconY + ')');
        icon.innerHTML =
          '<circle class="gate-icon-bg" r="8"></circle>' +
          '<path class="gate-icon-glyph" d="M -4.6,1.6 L -4.6,-0.4 L -3.6,-0.8 L -2.6,-3 L 2.6,-3 L 3.6,-0.8 L 4.6,-0.4 L 4.6,1.6 Z"></path>' +
          '<path class="gate-icon-window" d="M -2.1,-2.2 L 2.1,-2.2 L 2.8,-0.8 L -2.8,-0.8 Z"></path>' +
          '<circle class="gate-icon-wheel" cx="-2.8" cy="1.8" r="1.1"></circle>' +
          '<circle class="gate-icon-wheel" cx="2.8" cy="1.8" r="1.1"></circle>';
        wrap.appendChild(icon);

        var title = document.createElementNS(svgNS, 'text');
        title.setAttribute('class', 'gate-title');
        title.setAttribute('x', x); title.setAttribute('y', labelY1);
        title.textContent = gate.title.toUpperCase();
        wrap.appendChild(title);

        var subtitle = document.createElementNS(svgNS, 'text');
        subtitle.setAttribute('class', 'gate-subtitle');
        subtitle.setAttribute('x', x); subtitle.setAttribute('y', labelY2);
        subtitle.textContent = gate.subtitle;
        wrap.appendChild(subtitle);

        group.appendChild(wrap);
        items.push(wrap);
      });
      return items;
    }

    // Draws the flight state for a given 0..1 progress value. Shared by
    // both the pinned-scroll version (desktop) and the timed fallback
    // (mobile, where the section isn't pinned). Border gates fade in once
    // the flights are mostly drawn, telling the "fly in, or cross by
    // road" story in sequence as the user scrolls.
    function makeRenderer(routes, gateEls){
      function clamp01(v){ return Math.max(0, Math.min(1, v)); }
      return function render(current){
        var gateOpacity = current >= 0.85 ? Math.min(1, (current - 0.85) / 0.15) : 0;
        gateEls.forEach(function(g){ g.style.opacity = gateOpacity; });
        routes.forEach(function(r){
          var local = clamp01((current - r.startAt) / (r.endAt - r.startAt));
          r.pathEl.style.strokeDashoffset = r.len * (1 - local);
          if(local <= 0 || local >= 1){
            r.planeEl.style.opacity = 0;
          } else {
            r.planeEl.style.opacity = 1;
            var d = Math.min(r.len, local * r.len);
            var pt = r.pathEl.getPointAtLength(d);
            var pt2 = r.pathEl.getPointAtLength(Math.min(r.len, d + 0.6));
            var angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
            r.planeEl.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ') rotate(' + angle + ')');
          }
          if(r.destMarker) r.destMarker.style.opacity = local >= 0.94 ? 1 : 0.35;
          if(r.codeEl) r.codeEl.style.opacity = local >= 0.94 ? 1 : 0;
          if(r.labelEls) r.labelEls.forEach(function(el){ el.style.opacity = local >= 0.12 ? 1 : 0; });
        });
      };
    }

    // Desktop: the section is pinned (position:sticky) inside a tall
    // wrapper, so scrolling through that wrapper's extra height keeps the
    // map fixed on screen while driving the flight — the page only moves
    // on to the next section once the animation is fully played out.
    function initPinnedFlight(routes, gateEls){
      var wrapper = document.querySelector('.bhutan-scroll-pin');
      var render = makeRenderer(routes, gateEls);
      function clamp01(v){ return Math.max(0, Math.min(1, v)); }

      var target = 0, current = 0, ticking = false;

      function computeTarget(){
        var rect = wrapper.getBoundingClientRect();
        var vh = window.innerHeight;
        var scrollable = rect.height - vh;
        if(scrollable <= 0){ target = 1; return; }
        target = clamp01(-rect.top / scrollable);
      }

      function smoothStep(){
        current += (target - current) * 0.12;
        if(Math.abs(target - current) < 0.0008){
          current = target;
          render(current);
          ticking = false;
          return;
        }
        render(current);
        requestAnimationFrame(smoothStep);
      }

      function onScrollOrResize(){
        computeTarget();
        if(!ticking){
          ticking = true;
          requestAnimationFrame(smoothStep);
        }
      }

      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize);
      onScrollOrResize();
    }

    // Mobile: nothing is pinned (too fragile on small/touch screens), so
    // just play the flight once as the section comes into view.
    function initTimedFlight(routes, gateEls){
      var sectionEl = document.getElementById('explore-bhutan');
      var render = makeRenderer(routes, gateEls);
      function clamp01(v){ return Math.max(0, Math.min(1, v)); }
      function easeInOutQuad(t){ return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

      var triggered = false;
      var DURATION = 3200;

      function playFlight(){
        var startTime = null;
        function step(now){
          if(startTime === null) startTime = now;
          var t = clamp01((now - startTime) / DURATION);
          render(easeInOutQuad(t));
          if(t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }

      function checkTrigger(){
        if(triggered) return;
        var rect = sectionEl.getBoundingClientRect();
        if(rect.top < window.innerHeight * 0.6){
          triggered = true;
          window.removeEventListener('scroll', checkTrigger);
          playFlight();
        }
      }

      window.addEventListener('scroll', checkTrigger, { passive: true });
      checkTrigger();
    }

    function initFlightScroll(routes, gateEls){
      if(!routes.length) return;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if(reduced){
        routes.forEach(function(r){
          r.pathEl.style.strokeDashoffset = 0;
          r.planeEl.style.opacity = 0;
          if(r.destMarker) r.destMarker.style.opacity = 1;
          if(r.codeEl) r.codeEl.style.opacity = 1;
          if(r.labelEls) r.labelEls.forEach(function(el){ el.style.opacity = 1; });
        });
        gateEls.forEach(function(g){ g.style.opacity = 1; });
        return;
      }

      if(window.matchMedia('(min-width:901px)').matches){
        initPinnedFlight(routes, gateEls);
      } else {
        initTimedFlight(routes, gateEls);
      }
    }

    var assignments = matchDistricts();
    addMapLabels(assignments);
    wireMapInteractions(assignments);
    var flightRoutes = buildFlightRoutes(assignments);
    var borderGates = buildBorderGates(assignments);
    initFlightScroll(flightRoutes, borderGates);
  })();

  // Scroll reveal
  (function(){
    var els = document.querySelectorAll('.reveal');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      els.forEach(function(el){ el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function(el){ observer.observe(el); });
  })();

  // FAQ accordion
  (function(){
    var items = document.querySelectorAll('.faq-item');
    items.forEach(function(item){
      var question = item.querySelector('.faq-question');
      var answer = item.querySelector('.faq-answer');
      question.addEventListener('click', function(){
        var isOpen = item.classList.contains('open');
        items.forEach(function(other){
          other.classList.remove('open');
          other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-answer').style.maxHeight = null;
        });
        if(!isOpen){
          item.classList.add('open');
          question.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
    window.addEventListener('resize', function(){
      var open = document.querySelector('.faq-item.open .faq-answer');
      if(open) open.style.maxHeight = open.scrollHeight + 'px';
    });
  })();

  // Mobile hamburger menu — the header's own nav links are display:none
  // under 900px (see style.css), so this is the only way to navigate on
  // mobile. The hamburger button itself morphs into a close (×) icon via
  // its .is-active class — the panel used to also carry its own separate
  // close button in the same top-right corner, which read as two close
  // icons on screen at once; that button (and its #mobileNavClose id) was
  // removed from every page's HTML, so the hamburger is the only close
  // control now. closeBtn stays null-guarded below in case a page still
  // has a stray one.
  (function(){
    var btn = document.getElementById('hamburgerBtn');
    var panel = document.getElementById('mobileNav');
    var closeBtn = document.getElementById('mobileNavClose');
    if(!btn || !panel) return;

    function open(){
      panel.classList.add('is-open');
      btn.classList.add('is-active');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close(){
      panel.classList.remove('is-open');
      btn.classList.remove('is-active');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function(){
      if(panel.classList.contains('is-open')) close(); else open();
    });
    if(closeBtn) closeBtn.addEventListener('click', close);

    // Clicking any real link closes the panel and lets navigation proceed.
    panel.querySelectorAll('nav > a').forEach(function(a){
      a.addEventListener('click', close);
    });

    // Each category sub-menu ("Experiences", "Information", ...) expands
    // inline within the panel — every .mobile-nav-toggle button toggles
    // its own very next .mobile-nav-sub sibling, so this works whether a
    // page has one toggle or several.
    panel.querySelectorAll('.mobile-nav-toggle').forEach(function(subToggle){
      var sub = subToggle.nextElementSibling;
      if(!sub || !sub.classList.contains('mobile-nav-sub')) return;
      subToggle.addEventListener('click', function(){
        var isOpen = sub.classList.toggle('is-open');
        subToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      sub.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', close); });
    });

    window.addEventListener('resize', function(){
      if(window.innerWidth > 900) close();
    });
  })();

  // Tour gallery hero — video-in-place. The prev/next arrows are handled
  // by initCardSlider above; this just swaps the video slide's poster
  // image + play button for a local <video> (no external embed) on click.
  (function(){
    var videoSlide = document.querySelector('.tour-gallery-slide--video');
    var playBtn = videoSlide && videoSlide.querySelector('.tour-gallery-play');
    var videoSrc = videoSlide && videoSlide.dataset.videoSrc;
    if(!videoSlide || !playBtn || !videoSrc) return;

    playBtn.addEventListener('click', function(){
      if(videoSlide.querySelector('.tour-gallery-embed')) return;
      var video = document.createElement('video');
      video.className = 'tour-gallery-embed';
      video.src = videoSrc;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      videoSlide.appendChild(video);
      videoSlide.classList.add('is-playing');
    });
  })();

  // Tour gallery lightbox — clicking any non-video slide's photo opens it
  // at full size (the strip itself stays object-fit:cover by design, so
  // this is how a visitor sees the whole, uncropped image).
  (function(){
    var lightbox = document.getElementById('tourGalleryLightbox');
    var lightboxImg = document.getElementById('tourGalleryLightboxImg');
    var closeBtn = document.getElementById('tourGalleryLightboxClose');
    var prevBtn = document.getElementById('tourGalleryLightboxPrev');
    var nextBtn = document.getElementById('tourGalleryLightboxNext');
    var images = Array.prototype.slice.call(
      document.querySelectorAll('.tour-gallery-slide:not(.tour-gallery-slide--video) img')
    );
    if(!lightbox || !lightboxImg || !images.length) return;

    var currentIndex = 0;

    function render(){
      var img = images[currentIndex];
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt;
    }
    function open(index){
      currentIndex = index;
      render();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close(){
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    function showPrev(){
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      render();
    }
    function showNext(){
      currentIndex = (currentIndex + 1) % images.length;
      render();
    }

    images.forEach(function(img, index){
      img.addEventListener('click', function(){ open(index); });
    });
    if(closeBtn) closeBtn.addEventListener('click', close);
    if(prevBtn) prevBtn.addEventListener('click', showPrev);
    if(nextBtn) nextBtn.addEventListener('click', showNext);
    lightbox.addEventListener('click', function(e){
      if(e.target === lightbox) close();
    });
    window.addEventListener('keydown', function(e){
      if(!lightbox.classList.contains('is-open')) return;
      if(e.key === 'Escape') close();
      if(e.key === 'ArrowLeft') showPrev();
      if(e.key === 'ArrowRight') showNext();
    });
  })();
