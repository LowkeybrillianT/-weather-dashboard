/**
 * ═══════════════════════════════════════════════════════════════════
 *  Weather Analysis Dashboard – Bangalore Edition
 *  script.js  ·  Vanilla JavaScript · Chart.js · OpenWeatherMap API
 * ═══════════════════════════════════════════════════════════════════
 *
 *  ⚠️  SETUP: Replace API_KEY below with your free OpenWeatherMap key.
 *      Get one at: https://openweathermap.org/api
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ─── Configuration ─────────────────────────────────────────────── */
const CONFIG = {
  API_KEY: c974b56bf0fad04eec0543a874b4bc59,            // ← Replace with your key
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  DEFAULT_CITY: 'Bangalore',
  UNITS: 'metric',
  LANG: 'en',
};

/* ─── State ─────────────────────────────────────────────────────── */
let state = {
  currentCity: '',
  currentWeather: null,
  forecast: null,
  charts: { temp: null, humidity: null, rain: null },
  theme: 'dark',
  particleInterval: null,
};

/* ─── DOM Refs ──────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

/* ═══════════════════════════════════════════════════════════════════
   INITIALISATION
   ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme
  const savedTheme = localStorage.getItem('wdb-theme') || 'dark';
  if (savedTheme === 'light') toggleTheme(true);

  // Restore last city or use default
  const lastCity = localStorage.getItem('wdb-last-city') || CONFIG.DEFAULT_CITY;
  $('city-input').value = lastCity;

  // Allow pressing Enter in search
  $('city-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Start live clock
  updateClock();
  setInterval(updateClock, 1000);

  // Spawn ambient particles
  spawnParticles();

  // Fetch weather
  fetchWeatherData(lastCity);
});

/* ═══════════════════════════════════════════════════════════════════
   API – FETCH WEATHER DATA
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Fetches current weather + 5-day forecast for a city.
 * @param {string} city
 */
async function fetchWeatherData(city) {
  if (!city || city.trim() === '') { showError('Please enter a city name.'); return; }
  if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
    showError('⚠️ API key not set. Please open script.js and add your OpenWeatherMap API key.');
    showDemoData();
    return;
  }

  showLoading(true);
  city = city.trim();

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`),
      fetch(`${CONFIG.BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`),
    ]);

    if (!currentRes.ok) {
      const err = await currentRes.json();
      throw new Error(err.message || `City "${city}" not found.`);
    }

    const [current, forecast] = await Promise.all([
      currentRes.json(),
      forecastRes.json(),
    ]);

    state.currentWeather = current;
    state.forecast = forecast;
    state.currentCity = city;

    // Save to local storage
    localStorage.setItem('wdb-last-city', city);

    // Render everything
    renderCurrentWeather(current);
    renderMetricsStrip(current, forecast);
    renderForecast(forecast);
    renderCharts(forecast);
    renderInsights(current, forecast);
    updateBackground(current);
    updateLastUpdated();

    showLoading(false);
  } catch (err) {
    showLoading(false);
    showError(`❌ ${err.message}`);
    console.error('Weather fetch error:', err);
  }
}

/* ─── Fetch by Coordinates (Geolocation) ───────────────────────── */
async function fetchByCoords(lat, lon) {
  showLoading(true);
  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}`),
      fetch(`${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}`),
    ]);

    if (!currentRes.ok) throw new Error('Unable to get weather for your location.');

    const [current, forecast] = await Promise.all([
      currentRes.json(),
      forecastRes.json(),
    ]);

    state.currentWeather = current;
    state.forecast = forecast;
    state.currentCity = current.name;

    $('city-input').value = current.name;
    localStorage.setItem('wdb-last-city', current.name);

    renderCurrentWeather(current);
    renderMetricsStrip(current, forecast);
    renderForecast(forecast);
    renderCharts(forecast);
    renderInsights(current, forecast);
    updateBackground(current);
    updateLastUpdated();

    showLoading(false);
  } catch (err) {
    showLoading(false);
    showError(`❌ ${err.message}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER – CURRENT WEATHER
   ═══════════════════════════════════════════════════════════════════ */
function renderCurrentWeather(data) {
  const { name, sys, main, weather, wind, visibility, clouds } = data;

  // Location
  $('display-city').textContent = name;
  $('display-country').textContent = sys.country || '';

  // Temperature
  $('main-temp').textContent = Math.round(main.temp);
  $('main-condition').textContent = capitalise(weather[0].description);
  $('feels-like-text').textContent = `Feels like ${Math.round(main.feels_like)}°C  ·  ${getComfortLevel(main.feels_like)}`;
  $('main-weather-icon').textContent = getWeatherEmoji(weather[0].main, weather[0].id);

  // Stats
  $('stat-humidity').textContent = `${main.humidity}%`;
  $('stat-wind').textContent = `${Math.round(wind.speed * 3.6)} km/h`;
  $('stat-visibility').textContent = visibility ? `${(visibility / 1000).toFixed(1)} km` : 'N/A';
  $('stat-pressure').textContent = `${main.pressure} hPa`;

  // Sun schedule
  const tz = data.timezone;
  $('sunrise-time').textContent = formatUnixTime(sys.sunrise, tz);
  $('sunset-time').textContent  = formatUnixTime(sys.sunset,  tz);
  updateSunProgress(sys.sunrise, sys.sunset, tz);

  // UV Index (derived from UV category thresholds based on clouds / condition)
  const uvEst = estimateUV(weather[0].main, clouds.all);
  $('uv-index').textContent = uvEst.value;
  $('uv-desc').textContent  = uvEst.label;
  $('uv-bar').style.width   = `${Math.min((uvEst.value / 11) * 100, 100)}%`;

  // Sea level pressure
  const slp = main.sea_level || main.pressure;
  $('sea-level').textContent = slp;
  const slpPct = Math.min(Math.max(((slp - 980) / (1040 - 980)) * 100, 0), 100);
  $('sea-bar').style.width   = `${slpPct}%`;
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER – METRICS STRIP
   ═══════════════════════════════════════════════════════════════════ */
function renderMetricsStrip(current, forecast) {
  const todaySlices = getTodaySlices(forecast);
  const temps = todaySlices.map(s => s.main.temp);

  $('metric-max-temp').textContent = Math.round(Math.max(...temps, current.main.temp_max));
  $('metric-min-temp').textContent = Math.round(Math.min(...temps, current.main.temp_min));

  // Rain probability from first forecast slice
  const pop = forecast.list[0]?.pop ?? 0;
  $('metric-rain').textContent = Math.round(pop * 100);

  // Clouds
  $('metric-clouds').textContent = current.clouds.all;
  $('metric-clouds-sub').textContent = describeCloudCover(current.clouds.all);

  // Dew point estimate
  const dewPt = estimateDewPoint(current.main.temp, current.main.humidity);
  $('metric-dew').textContent = Math.round(dewPt);
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER – 5-DAY FORECAST CARDS
   ═══════════════════════════════════════════════════════════════════ */
function renderForecast(forecastData) {
  const dailySummary = aggregateDailyForecast(forecastData.list);
  const grid = $('forecast-grid');
  grid.innerHTML = '';

  dailySummary.slice(0, 5).forEach((day, i) => {
    const isToday = i === 0;
    const card = document.createElement('div');
    card.className = `forecast-card${isToday ? ' today' : ''}`;
    card.style.animationDelay = `${i * 0.08}s`;
    card.style.animation = 'fadeSlideUp 0.5s ease both';

    const rainPct = Math.round((day.pop || 0) * 100);

    card.innerHTML = `
      <div class="forecast-day">${isToday ? 'Today' : day.label}</div>
      <div class="forecast-icon">${getWeatherEmoji(day.condition, day.conditionId)}</div>
      <div class="forecast-temp-max">${Math.round(day.maxTemp)}°</div>
      <div class="forecast-temp-min">${Math.round(day.minTemp)}°</div>
      <div class="forecast-condition">${capitalise(day.description)}</div>
      <div class="rain-bar-wrap">
        <div class="rain-bar-label">
          <span>💧 Rain</span>
          <span>${rainPct}%</span>
        </div>
        <div class="rain-bar">
          <div class="rain-bar-fill" style="width: ${rainPct}%"></div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER – CHARTS (Chart.js)
   ═══════════════════════════════════════════════════════════════════ */
function renderCharts(forecastData) {
  const daily = aggregateDailyForecast(forecastData.list).slice(0, 5);
  const hourly = forecastData.list.slice(0, 8); // next 24 hours (3h intervals)

  const labels5d  = daily.map(d => d.label);
  const maxTemps  = daily.map(d => Math.round(d.maxTemp));
  const minTemps  = daily.map(d => Math.round(d.minTemp));
  const humidOld  = daily.map(d => Math.round(d.humidity));
  const hourLabels = hourly.map(h => new Date(h.dt * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const rainPops   = hourly.map(h => Math.round((h.pop || 0) * 100));

  const isLight = document.body.classList.contains('light-mode');
  const grid    = isLight ? 'rgba(0,60,120,0.08)'   : 'rgba(255,255,255,0.06)';
  const tick    = isLight ? 'rgba(20,60,100,0.5)'   : 'rgba(200,220,255,0.55)';

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(10,24,50,0.92)',
        titleColor: isLight ? '#0a1628' : '#f0f6ff',
        bodyColor: isLight ? '#1e3a5f' : '#c8deff',
        borderColor: 'rgba(56,208,245,0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: 'DM Mono', size: 11, weight: '500' },
        bodyFont:  { family: 'Outfit',  size: 13, weight: '500' },
      },
    },
    scales: {
      x: {
        grid: { color: grid },
        ticks: { color: tick, font: { family: 'DM Mono', size: 10 } },
        border: { display: false },
      },
      y: {
        grid: { color: grid },
        ticks: { color: tick, font: { family: 'DM Mono', size: 10 } },
        border: { display: false },
      },
    },
  };

  /* --- Temperature Chart --- */
  destroyChart('temp');
  const tempCtx = $('temp-chart').getContext('2d');
  const tempGradMax = tempCtx.createLinearGradient(0, 0, 0, 240);
  tempGradMax.addColorStop(0,   'rgba(56, 208, 245, 0.35)');
  tempGradMax.addColorStop(1,   'rgba(56, 208, 245, 0.0)');
  const tempGradMin = tempCtx.createLinearGradient(0, 0, 0, 240);
  tempGradMin.addColorStop(0,   'rgba(126, 180, 255, 0.25)');
  tempGradMin.addColorStop(1,   'rgba(126, 180, 255, 0.0)');

  state.charts.temp = new Chart(tempCtx, {
    type: 'line',
    data: {
      labels: labels5d,
      datasets: [
        {
          label: 'Max Temp (°C)',
          data: maxTemps,
          borderColor: '#38d0f5',
          backgroundColor: tempGradMax,
          borderWidth: 2.5,
          pointBackgroundColor: '#38d0f5',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Min Temp (°C)',
          data: minTemps,
          borderColor: '#7eb4ff',
          backgroundColor: tempGradMin,
          borderWidth: 2,
          pointBackgroundColor: '#7eb4ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}°C`,
          },
        },
      },
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}°` } },
      },
    },
  });

  /* --- Humidity Chart --- */
  destroyChart('humidity');
  const humCtx = $('humidity-chart').getContext('2d');
  const humGrad = humCtx.createLinearGradient(0, 0, 0, 240);
  humGrad.addColorStop(0, 'rgba(90, 236, 179, 0.4)');
  humGrad.addColorStop(1, 'rgba(90, 236, 179, 0.0)');

  state.charts.humidity = new Chart(humCtx, {
    type: 'bar',
    data: {
      labels: labels5d,
      datasets: [{
        label: 'Humidity (%)',
        data: humidOld,
        backgroundColor: humGrad,
        borderColor: '#5aecb3',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: { label: ctx => ` Humidity: ${ctx.parsed.y}%` },
        },
      },
      scales: {
        ...chartDefaults.scales,
        y: {
          ...chartDefaults.scales.y,
          min: 0, max: 100,
          ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` },
        },
      },
    },
  });

  /* --- Rain Probability Chart --- */
  destroyChart('rain');
  const rainCtx = $('rain-chart').getContext('2d');
  const rainGrad = rainCtx.createLinearGradient(0, 0, 0, 240);
  rainGrad.addColorStop(0, 'rgba(111, 184, 255, 0.5)');
  rainGrad.addColorStop(1, 'rgba(111, 184, 255, 0.05)');

  state.charts.rain = new Chart(rainCtx, {
    type: 'line',
    data: {
      labels: hourLabels,
      datasets: [{
        label: 'Rain Probability (%)',
        data: rainPops,
        borderColor: '#6fb8ff',
        backgroundColor: rainGrad,
        borderWidth: 2.5,
        pointBackgroundColor: '#6fb8ff',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: { label: ctx => ` Rain chance: ${ctx.parsed.y}%` },
        },
      },
      scales: {
        ...chartDefaults.scales,
        y: {
          ...chartDefaults.scales.y,
          min: 0, max: 100,
          ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` },
        },
      },
    },
  });
}

/* Safely destroy existing chart before re-creating */
function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    state.charts[key] = null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER – AI INSIGHTS
   ═══════════════════════════════════════════════════════════════════ */
function renderInsights(current, forecast) {
  const { main, weather, wind, clouds } = current;
  const temp     = main.temp;
  const humidity = main.humidity;
  const windKmh  = wind.speed * 3.6;
  const cond     = weather[0].main;
  const condId   = weather[0].id;
  const nextPop  = (forecast.list[0]?.pop ?? 0) * 100;

  const insights = [];

  /* ── Temperature ── */
  if (temp >= 40) {
    insights.push({ emoji: '🔥', title: 'Extreme Heat Alert', desc: `Current temp is ${Math.round(temp)}°C. Avoid outdoor activity between 11 AM–4 PM. Stay in shade and drink water frequently.`, badge: 'ALERT', badgeClass: 'badge-alert' });
  } else if (temp >= 35) {
    insights.push({ emoji: '☀️', title: 'High Temperature', desc: `At ${Math.round(temp)}°C, stay well hydrated. Wear light, breathable clothing and apply sunscreen outdoors.`, badge: 'WARN', badgeClass: 'badge-warn' });
  } else if (temp >= 28) {
    insights.push({ emoji: '🌤️', title: 'Warm & Pleasant', desc: `${Math.round(temp)}°C feels comfortable. Great conditions for outdoor activities in the morning or evening.`, badge: 'GOOD', badgeClass: 'badge-ok' });
  } else if (temp >= 18) {
    insights.push({ emoji: '😊', title: 'Comfortable Weather', desc: `${Math.round(temp)}°C — Ideal temperature range for Bangalore. Light clothing is sufficient for most activities.`, badge: 'IDEAL', badgeClass: 'badge-ok' });
  } else {
    insights.push({ emoji: '🧥', title: 'Cool Conditions', desc: `At ${Math.round(temp)}°C, carry a jacket or sweater. Mornings and evenings will feel chilly.`, badge: 'INFO', badgeClass: 'badge-info' });
  }

  /* ── Rain / Precipitation ── */
  if (condId >= 200 && condId < 300) {
    insights.push({ emoji: '⛈️', title: 'Thunderstorm Warning', desc: 'Severe thunderstorm in progress. Stay indoors, avoid open areas, and unplug sensitive electronics.', badge: 'ALERT', badgeClass: 'badge-alert' });
  } else if (condId >= 500 && condId < 600) {
    insights.push({ emoji: '🌧️', title: 'Rain in Progress', desc: 'It\'s raining right now. Carry an umbrella and expect traffic delays on Bangalore roads.', badge: 'RAIN', badgeClass: 'badge-info' });
  } else if (nextPop > 70) {
    insights.push({ emoji: '☔', title: 'High Rain Probability', desc: `${Math.round(nextPop)}% chance of rain in the next 3 hours. Carry an umbrella before stepping out.`, badge: 'LIKELY', badgeClass: 'badge-warn' });
  } else if (nextPop > 40) {
    insights.push({ emoji: '🌂', title: 'Possible Showers', desc: `Rain probability at ${Math.round(nextPop)}%. Keep an umbrella handy — Bangalore showers can be sudden.`, badge: 'POSSIBLE', badgeClass: 'badge-info' });
  }

  /* ── Humidity ── */
  if (humidity > 85) {
    insights.push({ emoji: '💦', title: 'Very High Humidity', desc: `${humidity}% humidity makes it feel significantly hotter. Expect discomfort — use fans or AC indoors.`, badge: 'HUMID', badgeClass: 'badge-warn' });
  } else if (humidity > 70) {
    insights.push({ emoji: '💧', title: 'Moderately Humid', desc: `Humidity at ${humidity}%. Slightly muggy conditions — light, moisture-wicking clothing recommended.`, badge: 'MUGGY', badgeClass: 'badge-info' });
  } else if (humidity < 30) {
    insights.push({ emoji: '🏜️', title: 'Low Humidity', desc: `At ${humidity}% humidity, the air is quite dry. Drink extra water and use a moisturizer if needed.`, badge: 'DRY', badgeClass: 'badge-info' });
  }

  /* ── Wind ── */
  if (windKmh > 60) {
    insights.push({ emoji: '🌪️', title: 'Strong Wind Warning', desc: `Wind speed at ${Math.round(windKmh)} km/h. Avoid driving two-wheelers on elevated roads or flyovers.`, badge: 'ALERT', badgeClass: 'badge-alert' });
  } else if (windKmh > 30) {
    insights.push({ emoji: '🌬️', title: 'Windy Conditions', desc: `${Math.round(windKmh)} km/h winds expected. Hold onto hats and secure loose outdoor objects.`, badge: 'WINDY', badgeClass: 'badge-warn' });
  } else if (windKmh > 10) {
    insights.push({ emoji: '🍃', title: 'Light Breeze', desc: `A pleasant ${Math.round(windKmh)} km/h breeze makes outdoor conditions comfortable today.`, badge: 'BREEZY', badgeClass: 'badge-ok' });
  }

  /* ── Cloud Cover ── */
  if (clouds.all < 20 && cond === 'Clear') {
    insights.push({ emoji: '🌞', title: 'Clear Skies', desc: 'Excellent visibility and sunny skies. Great day for outdoor activities, sports, or sightseeing in Bangalore.', badge: 'CLEAR', badgeClass: 'badge-ok' });
  } else if (clouds.all > 80) {
    insights.push({ emoji: '☁️', title: 'Overcast Skies', desc: `${clouds.all}% cloud cover. Diffused light with lower UV exposure — good conditions for outdoor exercise.`, badge: 'CLOUDY', badgeClass: 'badge-info' });
  }

  /* ── Bangalore-specific advice ── */
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9 && (condId >= 500 || nextPop > 30)) {
    insights.push({ emoji: '🚗', title: 'Rush Hour + Rain Combo', desc: 'Morning rush + wet roads = heavy traffic. Leave 20–30 minutes earlier for your commute today.', badge: 'COMMUTE', badgeClass: 'badge-warn' });
  }
  if (hour >= 17 && hour <= 20 && (condId >= 500 || nextPop > 30)) {
    insights.push({ emoji: '🛣️', title: 'Evening Commute Alert', desc: 'Rain during peak evening hours can cause waterlogging in low-lying areas of Bangalore. Plan your route.', badge: 'TRAFFIC', badgeClass: 'badge-warn' });
  }

  // Fallback if no specific advice
  if (insights.length < 2) {
    insights.push({ emoji: '✅', title: 'Conditions Normal', desc: 'No unusual weather alerts for Bangalore right now. Have a great day!', badge: 'NORMAL', badgeClass: 'badge-ok' });
  }

  // Render
  const list = $('insights-list');
  list.innerHTML = '';
  insights.forEach((ins, i) => {
    const item = document.createElement('div');
    item.className = 'insight-item';
    item.style.animationDelay = `${i * 0.1}s`;
    item.innerHTML = `
      <span class="insight-emoji">${ins.emoji}</span>
      <div class="insight-content">
        <div class="insight-title">${ins.title}</div>
        <div class="insight-desc">${ins.desc}</div>
      </div>
      <span class="insight-badge ${ins.badgeClass}">${ins.badge}</span>
    `;
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   BACKGROUND & PARTICLES
   ═══════════════════════════════════════════════════════════════════ */
function updateBackground(data) {
  const cond  = data.weather[0].main.toLowerCase();
  const condId = data.weather[0].id;
  const hour  = new Date().getHours();
  const isNight = hour < 6 || hour >= 20;

  // Remove old weather classes
  const cls = ['weather-clear','weather-rain','weather-clouds','weather-thunderstorm','weather-night','weather-haze','weather-mist','weather-fog','weather-snow'];
  document.body.classList.remove(...cls);

  if (isNight) {
    document.body.classList.add('weather-night');
  } else if (condId >= 200 && condId < 300) {
    document.body.classList.add('weather-thunderstorm');
  } else if (condId >= 500 && condId < 600) {
    document.body.classList.add('weather-rain');
  } else if (condId >= 700 && condId < 800) {
    document.body.classList.add(`weather-${cond}`);
  } else if (condId === 800) {
    document.body.classList.add('weather-clear');
  } else {
    document.body.classList.add('weather-clouds');
  }

  // Update particles
  clearParticles();
  if (condId >= 200 && condId < 600) {
    spawnRainDrops();
  } else {
    spawnParticles();
  }
}

function spawnParticles() {
  const container = $('particles');
  container.innerHTML = '';
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 120 + 40;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      --dur: ${Math.random() * 14 + 10}s;
      --delay: ${Math.random() * -20}s;
      --drift: ${(Math.random() - 0.5) * 300};
      opacity: 0;
    `;
    container.appendChild(p);
  }
}

function spawnRainDrops() {
  const container = $('particles');
  container.innerHTML = '';
  const count = 60;
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    drop.style.cssText = `
      left: ${Math.random() * 100}%;
      top: 0;
      width: ${Math.random() * 1.5 + 0.5}px;
      height: ${Math.random() * 20 + 10}px;
      --dur: ${(Math.random() * 0.6 + 0.5).toFixed(2)}s;
      animation-delay: ${(Math.random() * 2).toFixed(2)}s;
    `;
    container.appendChild(drop);
  }
}

function clearParticles() {
  const container = $('particles');
  container.innerHTML = '';
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS & UTILITIES
   ═══════════════════════════════════════════════════════════════════ */

/** Map OWM condition to emoji */
function getWeatherEmoji(main, id) {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 510) return '🌧️';
  if (id === 511)            return '🌨️';
  if (id >= 520 && id < 600) return '🌦️';
  if (id >= 600 && id < 700) return '❄️';
  if (id === 701)            return '🌫️';
  if (id === 711)            return '🌫️';
  if (id === 721)            return '🌫️';
  if (id === 731 || id === 751 || id === 761) return '🌪️';
  if (id === 741)            return '🌁';
  if (id === 781)            return '🌪️';
  if (id === 800)            return '☀️';
  if (id === 801)            return '🌤️';
  if (id === 802)            return '⛅';
  if (id === 803)            return '🌥️';
  if (id === 804)            return '☁️';
  return '🌡️';
}

/** Aggregate 3-hourly forecast into daily summaries */
function aggregateDailyForecast(list) {
  const days = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const key  = date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!days[key]) {
      days[key] = {
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        temps: [], humids: [], pops: [],
        condition: item.weather[0].main,
        conditionId: item.weather[0].id,
        description: item.weather[0].description,
      };
    }
    days[key].temps.push(item.main.temp);
    days[key].humids.push(item.main.humidity);
    days[key].pops.push(item.pop || 0);
    // Use midday condition as representative
    const h = date.getHours();
    if (h >= 11 && h <= 14) {
      days[key].condition   = item.weather[0].main;
      days[key].conditionId = item.weather[0].id;
      days[key].description = item.weather[0].description;
    }
  });

  return Object.values(days).map(d => ({
    ...d,
    maxTemp: Math.max(...d.temps),
    minTemp: Math.min(...d.temps),
    humidity: d.humids.reduce((a, b) => a + b, 0) / d.humids.length,
    pop: Math.max(...d.pops),
  }));
}

/** Get today's 3-hour slices */
function getTodaySlices(forecastData) {
  const today = new Date().toDateString();
  return forecastData.list.filter(item => new Date(item.dt * 1000).toDateString() === today);
}

/** Format unix timestamp to local HH:MM using timezone offset */
function formatUnixTime(unix, tzOffset) {
  const ms = (unix + tzOffset) * 1000;
  const d  = new Date(ms);
  const h  = String(d.getUTCHours()).padStart(2, '0');
  const m  = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Update the sun progress bar */
function updateSunProgress(sunrise, sunset, tz) {
  const now     = Math.floor(Date.now() / 1000);
  const dayLen  = sunset - sunrise;
  const elapsed = now - sunrise;
  let pct = Math.max(0, Math.min(100, (elapsed / dayLen) * 100));

  // Night check
  const isNight = now < sunrise || now > sunset;
  $('sun-pct-label').textContent = isNight ? 'Night time' : 'Day Progress';
  if (isNight) pct = now < sunrise ? 0 : 100;

  $('sun-progress-fill').style.width = `${pct}%`;
  $('sun-pct-val').textContent = `${Math.round(pct)}%`;
}

/** Estimate dew point from temp & humidity (Magnus formula) */
function estimateDewPoint(temp, humidity) {
  const a = 17.27, b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

/** Estimate UV index from condition & cloud cover */
function estimateUV(condition, cloudPct) {
  const hour = new Date().getHours();
  let base = 0;
  if (hour >= 10 && hour <= 14) base = 9;
  else if (hour >= 8 && hour <= 16) base = 5;
  else base = 0;

  if (condition === 'Rain' || condition === 'Thunderstorm') base = Math.min(base, 2);
  else base = Math.round(base * (1 - (cloudPct / 100) * 0.6));

  base = Math.max(0, Math.min(11, base));

  const labels = ['Low','Low','Low','Moderate','Moderate','Moderate','High','High','Very High','Very High','Very High','Extreme'];
  return { value: base, label: labels[base] || 'Low' };
}

/** Describe cloud cover percentage */
function describeCloudCover(pct) {
  if (pct < 10) return 'Clear skies';
  if (pct < 30) return 'Mostly clear';
  if (pct < 60) return 'Partly cloudy';
  if (pct < 85) return 'Mostly cloudy';
  return 'Overcast';
}

/** Get comfort level description */
function getComfortLevel(feelsLike) {
  if (feelsLike >= 40) return '🥵 Very hot';
  if (feelsLike >= 35) return '🔥 Hot';
  if (feelsLike >= 28) return '😊 Warm';
  if (feelsLike >= 18) return '😄 Comfortable';
  if (feelsLike >= 10) return '🧥 Cool';
  return '🥶 Cold';
}

/** Capitalise first letter of string */
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ─── Live Clock ─────────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-IN', opts);
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('date-time-display').textContent = `${dateStr} · ${timeStr}`;
}

/* ─── Last Updated ───────────────────────────────────────────────── */
function updateLastUpdated() {
  const now = new Date();
  $('last-updated').textContent = `Last updated: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — Data from OpenWeatherMap`;
}

/* ─── Loading Overlay ────────────────────────────────────────────── */
function showLoading(show) {
  const overlay = $('loading-overlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

/* ─── Error Toast ────────────────────────────────────────────────── */
function showError(msg) {
  $('error-msg').textContent = msg;
  const toast = $('error-toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 6000);
}

function hideError() {
  $('error-toast').classList.remove('show');
}

/* ═══════════════════════════════════════════════════════════════════
   USER ACTIONS
   ═══════════════════════════════════════════════════════════════════ */

/** Handle search button / Enter key */
function handleSearch() {
  const city = $('city-input').value.trim();
  if (!city) { showError('Please type a city name.'); return; }
  fetchWeatherData(city);
}

/** Use browser geolocation */
function useGeolocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  const btn = $('geo-btn');
  btn.textContent = '⌛';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.textContent = '📍';
      if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
        showError('⚠️ Add your API key in script.js to use geolocation.');
        return;
      }
      fetchByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      btn.textContent = '📍';
      showError('Location access denied. Please allow location permission and try again.');
    }
  );
}

/** Toggle dark/light mode */
function toggleTheme(forceLight = null) {
  const isLight = forceLight !== null ? forceLight : !document.body.classList.contains('light-mode');
  document.body.classList.toggle('light-mode', isLight);
  $('theme-btn').textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('wdb-theme', isLight ? 'light' : 'dark');
  state.theme = isLight ? 'light' : 'dark';

  // Re-render charts to update grid colors
  if (state.forecast) {
    renderCharts(state.forecast);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DEMO DATA (shows when API key not set)
   ═══════════════════════════════════════════════════════════════════ */
function showDemoData() {
  const demoCurrentWeather = {
    name: 'Bangalore',
    sys: { country: 'IN', sunrise: 1700000000, sunset: 1700043600 },
    main: { temp: 26, feels_like: 28, temp_min: 20, temp_max: 31, humidity: 72, pressure: 1012, sea_level: 1012 },
    weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds' }],
    wind: { speed: 3.5 },
    visibility: 8000,
    clouds: { all: 45 },
    timezone: 19800,
  };

  const now = Math.floor(Date.now() / 1000);
  const demoForecastList = [];
  const conditions = [
    { id: 802, main: 'Clouds', description: 'scattered clouds' },
    { id: 500, main: 'Rain',   description: 'light rain' },
    { id: 800, main: 'Clear',  description: 'clear sky' },
    { id: 804, main: 'Clouds', description: 'overcast clouds' },
    { id: 501, main: 'Rain',   description: 'moderate rain' },
  ];

  for (let d = 0; d < 5; d++) {
    for (let h = 0; h < 8; h++) {
      const idx = d;
      demoForecastList.push({
        dt: now + d * 86400 + h * 10800,
        main: {
          temp:     22 + Math.random() * 10,
          temp_min: 18 + d,
          temp_max: 30 + d * 0.5,
          humidity: 60 + Math.round(Math.random() * 30),
          pressure: 1010 + Math.round(Math.random() * 8),
        },
        weather: [conditions[idx % conditions.length]],
        wind:    { speed: 2 + Math.random() * 4 },
        clouds:  { all: Math.round(Math.random() * 90) },
        pop:     Math.random(),
      });
    }
  }

  state.currentWeather = demoCurrentWeather;
  state.forecast = { list: demoForecastList };

  renderCurrentWeather(demoCurrentWeather);
  renderMetricsStrip(demoCurrentWeather, { list: demoForecastList });
  renderForecast({ list: demoForecastList });
  renderCharts({ list: demoForecastList });
  renderInsights(demoCurrentWeather, { list: demoForecastList });
  updateBackground(demoCurrentWeather);
  updateLastUpdated();
  showLoading(false);
}
