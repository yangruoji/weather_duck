// 天气小鸭 PWA - 干净版本 Service Worker
const CACHE_NAME = 'weather-duck-clean-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg'
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// 网络请求拦截 - 极简版本
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只处理GET请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 只处理HTTP/HTTPS协议
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // 只处理同源请求
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const url = new URL(request.url);
      const isStaticResource = 
        url.pathname === '/' ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.png');
      
      if (isStaticResource) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        } catch (cacheError) {
          // 静默处理缓存错误
        }
      }
    }
    
    return networkResponse;
  } catch (error) {
    if (request.destination === 'document') {
      const cachedIndex = await caches.match('/');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    return new Response('应用离线中', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '天气提醒',
    icon: '/favicon.svg',
    badge: '/favicon.svg'
  };

  event.waitUntil(
    self.registration.showNotification('天气小鸭', options)
  );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

