// Escucha cuando llega una notificación push desde el servidor backend
self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {};
    
    const title = data.title || 'Farmacias Vitta+';
    const options = {
        body: data.body || 'Tienes un nuevo pedido asignado.',
        icon: '/favicon.ico', // Ícono de la notificación
        badge: '/favicon.ico'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Escucha cuando el repartidor hace clic sobre la notificación flotante
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/repartidor') // Abre directamente el portal del repartidor
    );
});