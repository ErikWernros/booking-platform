// Enkel memory cache utan Redis dependencies
const memoryCache = new Map();

const createMemoryCache = () => {
  console.log('💡 Using memory cache (Redis not available)');
  
  return {
    connect: async () => {
      console.log('✅ Memory cache ready');
    },
    get: async (key) => {
      const cached = memoryCache.get(key);
      if (cached && Date.now() < cached.expiry) {
        return cached.data;
      }
      return null;
    },
    setEx: async (key, seconds, value) => {
      memoryCache.set(key, {
        data: value,
        expiry: Date.now() + (seconds * 1000)
      });
    },
    del: async (keys) => {
      if (Array.isArray(keys)) {
        keys.forEach(key => memoryCache.delete(key));
      } else {
        memoryCache.delete(keys);
      }
    },
    keys: async (pattern) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(memoryCache.keys()).filter(key => regex.test(key));
    },
    isReady: true
  };
};

// Använd direkt memory cache utan Redis försök
const redisClient = createMemoryCache();

const connectRedis = async () => {
  await redisClient.connect();
};

module.exports = { redisClient, connectRedis };