// PWA 相关工具函数

/**
 * 注册 Service Worker
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          
          // 检查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新的 service worker 已安装，提示用户刷新
                showUpdateAvailable();
              }
            });
          });
        })
        .catch((registrationError) => {
          // 静默处理注册失败
        });
    });
  }
}

/**
 * 显示更新可用提示
 */
function showUpdateAvailable() {
  if (confirm('应用有新版本可用，是否立即更新？')) {
    window.location.reload();
  }
}

/**
 * 检查是否可以安装PWA
 */
export function checkInstallPrompt() {
  let deferredPrompt;
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton(deferredPrompt);
  });
  
  return deferredPrompt;
}

/**
 * 显示安装按钮
 */
function showInstallButton(deferredPrompt) {
  const installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', () => {
      installPWA(deferredPrompt);
    });
  }
}

/**
 * 安装PWA
 */
export function installPWA(deferredPrompt) {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      deferredPrompt = null;
    });
  }
}

/**
 * 请求通知权限
 */
export function requestNotificationPermission() {
  if ('Notification' in window) {
    return Notification.requestPermission().then((permission) => {
      return permission === 'granted';
    });
  }
  return Promise.resolve(false);
}

/**
 * 发送本地通知
 */
export function sendNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
}

/**
 * 检查网络状态
 */
export function checkNetworkStatus() {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    
    if (!isOnline) {
      sendNotification('网络连接已断开', {
        body: '应用将在离线模式下运行'
      });
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // 初始检查
  updateOnlineStatus();
}

/**
 * 获取设备信息
 */
export function getDeviceInfo() {
  return {
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsNotifications: 'Notification' in window,
    supportsPushManager: 'PushManager' in window
  };
}