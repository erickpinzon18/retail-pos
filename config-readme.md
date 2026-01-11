Retail POS Multi-Tienda - Especificaciones Técnicas

Este documento sirve como la guía principal para la generación y desarrollo del sistema Retail POS. Está diseñado para que una IA (Claude/Copilot) comprenda la arquitectura, las reglas de negocio y la estructura de archivos necesaria para construir el proyecto completo.

🚀 Stack Tecnológico Requerido

Frontend: React (Vite) + Tailwind CSS v4.

Iconografía: Lucide React.

Gráficas: Chart.js con react-chartjs-2.

Backend: Firebase Authentication & Firestore (Base de Datos NoSQL).

Gestión de Estado: React Context API (AuthContext y StoreContext).

📂 Arquitectura de Carpetas Recomendada

src/
├── api/ # Servicios y configuración de Firebase
├── components/
│ ├── ui/ # Componentes atómicos (Button, Input, Modal, Badge)
│ ├── layout/ # Sidebars, Navbars, Wrappers
│ └── shared/ # Gráficas y buscadores reutilizables
├── context/ # AuthContext.jsx y StoreContext.jsx
├── hooks/ # useFirestore, useSales, useAuth
├── pages/
│ ├── admin/ # Dashboard, Stores, Users, Reports
│ ├── store/ # Login, POS, Inventory, Sales, Clients
│ └── client/ # ClientHome (Vista móvil)
└── utils/ # Formateo de moneda, lógica de fechas (dayType)

🖥️ Mapa de Pantallas y Funcionalidades

1. Módulo Administrativo (/admin)

Dashboard (Dashboard.jsx): Vista de alto nivel con gráfica de líneas de ventas diarias por tienda. Métricas globales de ingresos, órdenes y clientes.

Gestión de Tiendas (ManageStores.jsx): CRUD de sucursales. Incluye comparativa visual de ventas: Entre Semana vs Fin de Semana.

Gestión de Usuarios (ManageUsers.jsx): Administración de personal. Buscador dinámico, asignación de tienda, rol (admin | seller) y tipo de horario.

Reportes Avanzados (AdvancedReport.jsx): Análisis de productividad por cajero (ventas totales, ticket promedio). Gráficas de dona por categorías.

Generar Reporte (GenerateReport.jsx): Vista estilo documento para impresión/PDF con resumen financiero mensual.

2. Módulo de Sucursal (/store)

Login (Login.jsx): Autenticación vía Firebase. Redirección por rol: admin va al dashboard, seller va al POS.

Punto de Venta (Checkout.jsx): Interfaz de ventas. Escaneo/Búsqueda de productos, carrito dinámico, aplicación de descuentos y registro de venta vinculado a Cliente (vía QR).

Ventas de Tienda (StoreSales.jsx): Historial de transacciones de la sucursal. Requiere PIN de Administrador para cancelaciones o devoluciones.

Gestión de Productos (ManageProducts.jsx): Control de stock, SKU, precios de costo y venta. Alertas de inventario bajo.

Gestión de Clientes (ManageClients.jsx): CRM con historial de compras. Gestión de Apartados (pagos parciales, estatus y fechas de vencimiento).

Configuración (StoreConfig.jsx): Personalización de datos del ticket de venta (dirección, pie de página, teléfono).

Promociones (ViewPromotions.jsx): Catálogo de ofertas vigentes (2x1, descuentos porcentuales).

3. Módulo Cliente (/client)

Home Cliente (ClientHome.jsx): App móvil para el cliente. Muestra su QR de identificación, estatus VIP, puntos y promociones personalizadas.

🔢 Lógica de Negocio y Base de Datos (Firestore)

Reglas Críticas:

Atribución de Ventas (dayType): Al guardar una venta en sales/, el sistema debe calcular automáticamente si es weekend (Sábado/Domingo) o weekday (Lunes-Viernes).

Seguridad: Las operaciones sensibles en la tienda (devoluciones) se bloquean con un modal de PIN.

Multi-tenancy: Cada usuario de tipo seller está "atado" a un storeId. Solo ve los productos, clientes y apartados de su tienda. El admin tiene acceso global.

Fidelización: Los clientes acumulan puntos basados en el total de la venta. El sistema debe marcar automáticamente como isVip: true si superan un umbral de gasto mensual.

Colecciones de Firestore:

users/: Perfiles, roles y storeId.

stores/: Configuración de sucursal.

sales/: Registro plano de todas las transacciones (para estadísticas rápidas).

products/: Catálogo con referencia a tienda.

apartados/: Registro de deudas y abonos.

customers/: Datos de contacto, QR, puntos y estatus VIP.

🎨 Guía de Estilo

Bordes: rounded-xl o rounded-2xl para un look moderno.

Sombras: shadow-lg para elevar tarjetas sobre el fondo gris claro (bg-gray-100).

Colores: Primario: Indigo-600, Éxito: Green-500, Peligro: Red-500.

Responsividad: Desktop para administración/caja; Mobile-First para la vista del cliente.
