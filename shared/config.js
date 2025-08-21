// Shared configuration for frontend and backend
const config = {
  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    version: 'v1',
    timeout: 10000
  },
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/carbon_management',
    pool: {
      min: 2,
      max: 10
    }
  },
  
  // Frontend Configuration
  frontend: {
    port: process.env.FRONTEND_PORT || 8080,
    buildPath: './frontend/dist',
    apiProxy: '/api'
  },
  
  // Backend Configuration
  backend: {
    port: process.env.BACKEND_PORT || 3000,
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:8080',
      credentials: true
    }
  },
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '24h'
  }
};

module.exports = config;
