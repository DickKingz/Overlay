# Website Integration Guide

This guide shows how to integrate DataKingz Illuvium build data into your website or web application.

## 🚀 Quick Start

### 1. Fetch Build Data

```javascript
// Simple fetch example
fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json')
  .then(response => response.json())
  .then(builds => {
    console.log('Latest builds:', builds);
    // Display builds on your website
  });
```

### 2. Available Endpoints

| Endpoint | Description | URL |
|----------|-------------|-----|
| Latest Builds | Most recent winning builds | `https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json` |
| Gauntlet Builds | Gauntlet-specific builds | `https://raw.githubusercontent.com/DickKingz/Overlay/main/data/gauntlet_builds.json` |
| Builds Index | Metadata and statistics | `https://raw.githubusercontent.com/DickKingz/Overlay/main/data/builds_index.json` |

## 📊 Data Structure

### Build Object
```json
{
  "id": "unique_build_id",
  "playerName": "PlayerName",
  "placement": 1,
  "matchDate": "2024-01-15T10:30:00Z",
  "illuvials": [
    {
      "displayName": "Illuvial Name",
      "imageURL": "https://example.com/image.png",
      "isBonded": true,
      "combatAffinity": "Fire",
      "combatClass": "Fighter",
      "tier": 3,
      "stage": 3,
      "augments": ["Augment1", "Augment2", "Augment3"]
    }
  ],
  "weapons": ["Weapon1", "Weapon2"],
  "suit": "SuitName"
}
```

### Index Object
```json
{
  "last_updated": "2024-01-15T10:30:00Z",
  "total_builds": 50,
  "builds": [
    {
      "player_name": "PlayerName",
      "placement": 1,
      "match_date": "2024-01-15",
      "illuvials_count": 7,
      "has_bonded": true,
      "build_id": "unique_id"
    }
  ]
}
```

## 🔧 Integration Examples

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function BuildsDisplay() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json')
      .then(response => response.json())
      .then(data => {
        setBuilds(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching builds:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading builds...</div>;

  return (
    <div className="builds-grid">
      {builds.map(build => (
        <div key={build.id} className="build-card">
          <h3>{build.playerName}</h3>
          <p>Placement: #{build.placement}</p>
          <div className="illuvials">
            {build.illuvials.map(illuvial => (
              <div key={illuvial.displayName} className={`illuvial ${illuvial.isBonded ? 'bonded' : ''}`}>
                <img src={illuvial.imageURL} alt={illuvial.displayName} />
                <span>{illuvial.displayName}</span>
                {illuvial.isBonded && <span className="bond-badge">🔗</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Vue.js Component Example

```vue
<template>
  <div class="builds-container">
    <div v-if="loading">Loading builds...</div>
    <div v-else class="builds-grid">
      <div v-for="build in builds" :key="build.id" class="build-card">
        <h3>{{ build.playerName }}</h3>
        <p>Placement: #{{ build.placement }}</p>
        <div class="illuvials">
          <div 
            v-for="illuvial in build.illuvials" 
            :key="illuvial.displayName"
            :class="['illuvial', { bonded: illuvial.isBonded }]"
          >
            <img :src="illuvial.imageURL" :alt="illuvial.displayName" />
            <span>{{ illuvial.displayName }}</span>
            <span v-if="illuvial.isBonded" class="bond-badge">🔗</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      builds: [],
      loading: true
    };
  },
  async mounted() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json');
      this.builds = await response.json();
    } catch (error) {
      console.error('Error fetching builds:', error);
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

### Vanilla JavaScript Example

```javascript
class BuildsManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.builds = [];
  }

  async loadBuilds() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json');
      this.builds = await response.json();
      this.render();
    } catch (error) {
      console.error('Error loading builds:', error);
    }
  }

  render() {
    this.container.innerHTML = this.builds.map(build => `
      <div class="build-card">
        <h3>${build.playerName}</h3>
        <p>Placement: #${build.placement}</p>
        <div class="illuvials">
          ${build.illuvials.map(illuvial => `
            <div class="illuvial ${illuvial.isBonded ? 'bonded' : ''}">
              <img src="${illuvial.imageURL}" alt="${illuvial.displayName}" />
              <span>${illuvial.displayName}</span>
              ${illuvial.isBonded ? '<span class="bond-badge">🔗</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }
}

// Usage
const buildsManager = new BuildsManager('builds-container');
buildsManager.loadBuilds();
```

## 🎨 CSS Styling Examples

### Basic Grid Layout
```css
.builds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.build-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.illuvials {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.illuvial {
  text-align: center;
  position: relative;
}

.illuvial.bonded {
  border: 2px solid #ffd700;
  border-radius: 4px;
}

.bond-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ffd700;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Dark Theme
```css
.builds-grid {
  background: #1a1a1a;
  color: white;
}

.build-card {
  background: #2d2d2d;
  border-color: #444;
  color: white;
}

.illuvial.bonded {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}
```

## 🔄 Caching and Performance

### Local Storage Caching
```javascript
class CachedBuildsAPI {
  constructor() {
    this.cacheKey = 'illuvium_builds_cache';
    this.cacheDuration = 3600000; // 1 hour
  }

  async getBuilds() {
    // Check cache first
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.cacheDuration) {
        return data;
      }
    }

    // Fetch fresh data
    const response = await fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json');
    const data = await response.json();

    // Cache the data
    localStorage.setItem(this.cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    return data;
  }
}
```

### Service Worker Caching
```javascript
// service-worker.js
self.addEventListener('fetch', event => {
  if (event.request.url.includes('raw.githubusercontent.com/DickKingz/Overlay')) {
    event.respondWith(
      caches.open('builds-cache').then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});
```

## 📱 Mobile Optimization

### Responsive Design
```css
@media (max-width: 768px) {
  .builds-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 10px;
  }

  .build-card {
    padding: 10px;
  }

  .illuvials {
    grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
    gap: 5px;
  }
}
```

## 🔍 Search and Filtering

### Search Implementation
```javascript
function searchBuilds(builds, query) {
  const searchTerm = query.toLowerCase();
  return builds.filter(build => 
    build.playerName.toLowerCase().includes(searchTerm) ||
    build.illuvials.some(illuvial => 
      illuvial.displayName.toLowerCase().includes(searchTerm) ||
      illuvial.combatAffinity.toLowerCase().includes(searchTerm)
    )
  );
}

// Usage
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', (e) => {
  const filtered = searchBuilds(allBuilds, e.target.value);
  displayBuilds(filtered);
});
```

### Filter by Player
```javascript
function filterByPlayer(builds, playerName) {
  return builds.filter(build => 
    build.playerName.toLowerCase().includes(playerName.toLowerCase())
  );
}

// Filter by bonded builds
function filterBondedBuilds(builds) {
  return builds.filter(build => 
    build.illuvials.some(illuvial => illuvial.isBonded)
  );
}
```

## 🚀 Deployment Tips

1. **Use CDN**: Consider using a CDN for better performance
2. **Error Handling**: Always handle network errors gracefully
3. **Loading States**: Show loading indicators while fetching data
4. **Fallback Data**: Provide fallback data when API is unavailable
5. **Rate Limiting**: Be mindful of GitHub's rate limits

## 📈 Analytics Integration

### Google Analytics
```javascript
// Track build views
function trackBuildView(buildId, playerName) {
  gtag('event', 'build_view', {
    'build_id': buildId,
    'player_name': playerName
  });
}

// Track search queries
function trackSearch(query) {
  gtag('event', 'search', {
    'search_term': query
  });
}
```

## 🔗 Additional Resources

- [GitHub Raw Content API](https://docs.github.com/en/rest/repos/contents#get-repository-content)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [DataKingz Repository](https://github.com/DickKingz/Overlay)

## 📞 Support

For questions or issues with the build data:
- Check the [GitHub repository](https://github.com/DickKingz/Overlay)
- Review the data structure documentation
- Test with the provided examples

---

**Note**: This data is automatically updated daily. The build data represents recent winning compositions from top Illuvium Arena Gauntlet players. 