const fs = require("fs");
const path = require("path");

const files = {
  "client/src/main.jsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,

  "client/src/api.js": `import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const campaignAPI = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(\`/campaigns/\${id}\`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(\`/campaigns/\${id}\`, data),
};

export const planningAPI = {
  getItems: (campaignId, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(\`/campaigns/\${campaignId}/planning-items?\${params.toString()}\`);
  },
  getById: (id) => api.get(\`/planning-items/\${id}\`),
  create: (campaignId, data) => api.post(\`/campaigns/\${campaignId}/planning-items\`, data),
  update: (id, data) => api.put(\`/planning-items/\${id}\`, data),
  delete: (id) => api.delete(\`/planning-items/\${id}\`),
};

export const budgetAPI = {
  getItems: (campaignId, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(\`/campaigns/\${campaignId}/budget-items?\${params.toString()}\`);
  },
  getSummary: (campaignId) => api.get(\`/campaigns/\${campaignId}/budget-summary\`),
  create: (campaignId, data) => api.post(\`/campaigns/\${campaignId}/budget-items\`, data),
  update: (id, data) => api.put(\`/budget-items/\${id}\`, data),
  delete: (id) => api.delete(\`/budget-items/\${id}\`),
};

export const dashboardAPI = {
  getSummary: (campaignId) => api.get(\`/campaigns/\${campaignId}/summary\`),
  getNotifications: (campaignId) => api.get(\`/campaigns/\${campaignId}/notifications\`),
};

export default api;`,
};

// Create directories
const dirs = [
  "client/src",
  "client/src/components"
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Write files
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`? Created: ${filePath}`);
});

console.log("\nFiles created successfully!");
