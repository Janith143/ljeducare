/* Firebase Cloud Messaging service worker (web push).
   Uses the public Firebase config (safe to expose). Background messages show a
   notification; foreground messages are handled by the app. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyCfl1nfoV09AkV7HjX7ImQizuuY2xtT4xg',
    authDomain: 'ljeducare.firebaseapp.com',
    projectId: 'ljeducare',
    storageBucket: 'ljeducare.firebasestorage.app',
    messagingSenderId: '852483320444',
    appId: '1:852483320444:web:b81cae0f6ababfcc7bb7f9',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    if (title) {
        self.registration.showNotification(title, {
            body: body || '',
            icon: '/icon-192.png',
            data: { link: payload.fcmOptions?.link || payload.data?.link || '/' },
        });
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data?.link || '/'));
});
