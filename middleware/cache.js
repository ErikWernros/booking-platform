const { redisClient } = require('../config/redis');

// Enkel cache middleware
exports.cache = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      // Försök hämta från cache
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log('⚡ Serving from cache:', key);
        return res.json(JSON.parse(cachedData));
      }

      // Spara original res.json
      const originalJson = res.json;
      
      // Override för att cacha response
      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cacha successful responses
          redisClient.setEx(key, duration, JSON.stringify(data))
            .catch(err => console.log('❌ Cache set error (non-critical):', err.message));
        }
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.log('❌ Cache middleware error, bypassing cache');
      next();
    }
  };
};

// Rensa cache
exports.clearCache = (pattern) => {
  return async (req, res, next) => {
    // Kör först nästa middleware/controller
    await next();
    
    // Rensa cache efteråt
    try {
      if (pattern) {
        const keys = await redisClient.keys(`cache:${pattern}`);
        if (keys.length > 0) {
          await redisClient.del(keys);
          console.log('🗑️  Cleared cache for:', pattern);
        }
      }
    } catch (error) {
      console.log('❌ Clear cache error (non-critical):', error.message);
    }
  };
};