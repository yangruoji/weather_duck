const CACHE_NAME = 'weather-diary-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('预缓存核心资源');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('预缓存失败:', error);
      })
  );
  // 立即激活新的Service Worker
  self.skipWaiting();
});

// 监听消息事件
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即控制所有页面
  self.clients.claim();
});

// 网络请求拦截 - 简化版本
self.addEventListener('fetch', (event) => {
  // 只处理同源的GET请求
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 网络优先策略
        return fetch(event.request)
          .then((response) => {
            // 只缓存成功的响应
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // 网络失败时返回离线页面
            if (event.request.destination === 'document') {
              return caches.match('/') || new Response('离线模式', {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            }
          });
      })
  );
});

// 推送通知处理
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新的天气提醒',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
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

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  console.log('通知被点击');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});