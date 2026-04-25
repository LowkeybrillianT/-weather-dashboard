# 🌦️ Weather Analysis Dashboard – Bangalore Edition

<div align="center">

![Weather Dashboard Banner](https://img.shields.io/badge/Weather-Dashboard-38d0f5?style=for-the-badge&logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4.1-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![OpenWeatherMap](https://img.shields.io/badge/OpenWeatherMap-API-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A production-quality, real-time weather analysis dashboard built for Bangalore — featuring live data, interactive charts, and AI-powered smart insights.**

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 📸 Screenshots

### 🌙 Dark Mode
<p align="center">
  <img src="https://github.com/user-attachments/assets/e5016980-f6d5-403f-8175-745ccfb2cca4" width="90%">
</p>

<br>

### ☀️ Light Mode
<p align="center">
  <img src="https://github.com/user-attachments/assets/d02b19b9-9bec-49cf-acb1-64a766c09960" width="90%">
</p>


---

## ✨ Features

### 🌡️ Real-Time Weather Data
- Current temperature, feels-like, min/max
- Humidity, wind speed, pressure, visibility
- Cloud cover percentage and description
- Weather condition with contextual emoji icons

### 📊 Interactive Data Visualizations
- **Temperature Trend** — 5-day max/min line chart with gradient fills
- **Humidity Analysis** — Daily bar chart with animated rendering
- **Rain Probability** — 24-hour hourly precipitation forecast chart
- Tooltips with detailed values on hover

### 🤖 AI Insights Engine
Generates dynamic, human-like recommendations based on:
- Temperature thresholds (cool / comfortable / warm / hot / extreme)
- Rain probability & active precipitation conditions
- Humidity comfort levels
- Wind speed categories
- **Bangalore-specific advice** for commute timing, traffic alerts, and city-relevant tips

### 🔍 City Search
- Search any city worldwide — dashboard updates dynamically
- Defaults to Bangalore on first load
- Last searched city persisted via `localStorage`

### 📍 Geolocation
- One-click button to detect your current location
- Automatically fetches weather for your GPS coordinates

### 🌙 Dark / Light Mode
- Toggle between atmospheric dark (default) and clean light theme
- Theme preference saved in `localStorage`

### 🎨 Dynamic Backgrounds
Background gradient shifts based on current weather condition:
- ☀️ Clear → Deep ocean blue
- 🌧️ Rain → Dark stormy navy
- ⛈️ Thunderstorm → Near-black dramatic
- ☁️ Cloudy → Muted slate
- 🌙 Night → Deep midnight

### 🌊 Animated Weather Particles
- **Clear/Cloudy** → Soft floating orbs
- **Rain/Storm** → Animated falling raindrops

### 📅 5-Day Forecast Cards
- Daily high/low temperatures
- Weather icons and condition descriptions
- Rain probability bar for each day
- "Today" badge on current day card

### ⚡ Extra Metrics
- Dew point (calculated via Magnus formula)
- Estimated UV index with comfort label
- Sea-level pressure gauge
- Cloud cover description
- Sunrise / Sunset times with live day progress bar

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure |
| **CSS3** | Glassmorphism design, animations, responsive layout |
| **Vanilla JavaScript (ES6+)** | App logic, API calls, DOM manipulation |
| **Chart.js 4.4.1** | Temperature, humidity, and rain probability charts |
| **OpenWeatherMap API** | Real-time weather & 5-day forecast data |
| **Google Fonts** | `Outfit` + `DM Mono` for typography |
| **CSS Custom Properties** | Theming and design tokens |

---

## 📁 Project Structure

```
weather-dashboard/
├── index.html          # Main HTML structure
├── style.css           # Full stylesheet (glassmorphism, animations, responsive)
├── script.js           # App logic, API, charts, insights engine
├── assets/             # Icons, screenshots, images
│   ├── screenshot-dark.png
│   └── screenshot-light.png
└── README.md           # This file
```

---

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/weather-dashboard.git
cd weather-dashboard
```

### 2. Get Your Free API Key

1. Go to [https://openweathermap.org/](https://openweathermap.org/)
2. Create a free account
3. Navigate to **API Keys** in your account dashboard
4. Copy your default API key (or generate a new one)
5. Note: New keys may take **10–30 minutes** to activate

### 3. Add Your API Key

Open `script.js` and replace the placeholder on line 17:

```javascript
const CONFIG = {
  API_KEY: 'YOUR_API_KEY_HERE',   // ← Replace this
  ...
};
```

### 4. Run the Dashboard

Simply open `index.html` in your browser:

```bash
# Option A: Direct file
open index.html

# Option B: Local server (recommended to avoid CORS on some browsers)
npx serve .
# or
python3 -m http.server 8080
# then visit http://localhost:8080
```

> **No build step required.** Zero dependencies to install. Pure HTML/CSS/JS.

---

## 🔑 API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /data/2.5/weather` | Current weather for a city |
| `GET /data/2.5/forecast` | 5-day / 3-hour forecast |

Both use `units=metric` for Celsius temperatures.

**Free tier limits:** 60 calls/minute · 1,000,000 calls/month — more than enough for personal use.

---

## 🎯 Smart Insights Logic

The AI Insights Engine evaluates multiple weather parameters and stacks relevant alerts:

| Condition | Threshold | Insight Type |
|---|---|---|
| Temperature | ≥ 40°C | 🔴 Extreme Heat Alert |
| Temperature | ≥ 35°C | 🟡 High Temperature Warning |
| Temperature | 18–28°C | 🟢 Comfortable / Ideal |
| Rain Probability | > 70% | 🟡 Carry Umbrella |
| Active Rain | ID 500–599 | 🔵 Rain in Progress |
| Thunderstorm | ID 200–299 | 🔴 Severe Weather Warning |
| Humidity | > 85% | 🟡 High Humidity Alert |
| Wind Speed | > 60 km/h | 🔴 Strong Wind Warning |
| Wind Speed | > 30 km/h | 🟡 Windy Conditions |
| Rush Hour + Rain | 7–9 AM / 5–8 PM | 🚦 Bangalore Commute Alert |

---

## 🔧 Customisation

### Change Default City
In `script.js`:
```javascript
DEFAULT_CITY: 'Bangalore',   // Change to any city
```

### Add More Insight Rules
Extend the `renderInsights()` function in `script.js` — each insight follows this structure:
```javascript
insights.push({
  emoji: '🌊',
  title: 'Coastal Alert',
  desc: 'Your description here.',
  badge: 'ALERT',
  badgeClass: 'badge-alert'  // badge-alert | badge-warn | badge-info | badge-ok
});
```

### Modify Theme Colors
All colors are CSS custom properties in `style.css` under `:root` and `body.light-mode`.

---

## 🔮 Future Improvements

- [ ] **Air Quality Index (AQI)** — Integrate OpenWeatherMap Air Pollution API
- [ ] **Weather Alerts** — Push notifications for severe weather
- [ ] **Hourly Chart** — Clickable day cards expanding to hourly breakdown
- [ ] **Radar Map** — Embedded precipitation radar using Leaflet.js
- [ ] **Historical Data** — Week-over-week temperature comparison
- [ ] **Multi-City Comparison** — Side-by-side dashboard for multiple cities
- [ ] **PWA Support** — Offline capability and home screen install
- [ ] **Share/Export** — Screenshot or PDF export of the dashboard
- [ ] **Unit Toggle** — Switch between °C / °F / K
- [ ] **Language Support** — i18n for regional languages including Kannada

---

## 🐛 Troubleshooting

| Issue | Solution |
|---|---|
| Charts not rendering | Ensure `chart.umd.min.js` CDN loads (check internet) |
| "City not found" error | Check spelling; use English city names |
| API key not working | Key may still be activating (wait 30 min after creation) |
| Geolocation denied | Allow location in browser settings |
| Blank page | Check browser console for JS errors |

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- [OpenWeatherMap](https://openweathermap.org/) — for the excellent free weather API
- [Chart.js](https://www.chartjs.org/) — for the beautiful, accessible chart library
- [Google Fonts](https://fonts.google.com/) — Outfit & DM Mono typefaces

---

<div align="center">

Made with ❤️ for Bangalore · **Weather Dashboard v1.0**

⭐ Star this repo if you found it useful!

</div>
