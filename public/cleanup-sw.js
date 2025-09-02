// Service Worker清理脚本
(async function() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
      
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    } catch (error) {
      // 静默处理错误
    }
  }
})();