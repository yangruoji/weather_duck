const CACHE_NAME = 'weather-diary-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon.svg'
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  // 只处理HTTP/HTTPS请求，过滤掉chrome-extension等协议
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // 只处理GET请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果缓存中有响应，则返回缓存的版本
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 否则发起网络请求
        return fetch(event.request)
          .then((networkResponse) => {
            // 检查响应是否有效
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // 只缓存同源的静态资源
            const url = new URL(event.request.url);
            const isStaticResource = url.pathname.match(/\.(js|css|html|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
            const isSameOrigin = url.origin === self.location.origin;
            
            if (isSameOrigin && (isStaticResource || url.pathname === '/')) {
              // 克隆响应用于缓存
              const responseToCache = networkResponse.clone();
              
              // 异步缓存，不阻塞响应
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  console.warn('缓存失败:', error);
                });
            }
            
            return networkResponse;
          })
          .catch(() => {
            // 网络请求失败时，尝试返回缓存的内容或离线页面
            return caches.match('/') || new Response('应用离线中', {
              status: 200,
              statusText: 'OK',
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
      })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新的天气提醒',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('天气小鸭日记', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});