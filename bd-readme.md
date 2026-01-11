Estructura de Base de Datos - Retail POS

Este documento define la arquitectura simplificada de Firebase (Auth y Firestore) para el sistema Retail POS. Esta estructura está diseñada para facilitar la escalabilidad y permitir reportes rápidos tanto para cajeros como para administradores.

🔐 1. Autenticación (Firebase Auth)

Se utiliza Firebase Authentication para el manejo de sesiones.

Identificador Único: uid (Este ID es la llave para la colección de usuarios).

Método: Correo electrónico y contraseña.

📂 2. Estructura de Firestore (Colecciones)

👤 Colección: users

Almacena el perfil, el rol y la sucursal asignada.

Ruta: users/{uid}

Campos:

name: String (Nombre completo)

email: String (Correo electrónico)

storeId: String (ID del documento en la colección stores)

role: String (admin | seller)

status: String (active | inactive)

createdAt: Timestamp

🏪 Colección: stores

Configuración de cada sucursal e información de contacto para el ticket.

Ruta: stores/{storeId}

Campos:

name: String (Nombre de la tienda)

address: String (Dirección completa)

phone: String (Teléfono de contacto)

ticketFooter: String (Mensaje al final del ticket)

taxPercentage: Number (Ejemplo: 16)

💰 Colección: sales (Global)

Se recomienda una colección global para que el Administrador pueda monitorear todas las tiendas sin hacer consultas complejas.

Ruta: sales/{saleId}

Campos:

storeId: String (Referencia a la tienda)

userId: String (ID del vendedor/cajero que hizo la venta)

customerId: String (ID del cliente o "mostrador")

items: Array [{productId, name, price, quantity}]

total: Number

paymentMethod: String (cash, card, transfer)

dayType: String (weekday | weekend) -> Calculado por código al guardar

date: Timestamp

📦 Colección: apartados

Control de pagos parciales vinculado a la tienda.

Ruta: apartados/{apartadoId}

Campos:

storeId: String

customerId: String

totalAmount: Number

paidAmount: Number

status: String (active | completed | expired)

dueDate: Timestamp

🏷️ Colección: promotions

Ruta: promotions/{promoId}

Campos:

storeId: String (ID específico o "global")

title: String

type: String (percentage, fixed, 2x1)

value: Number

status: Boolean (Activa/Inactiva)

📉 3. Lógica de Estadísticas (Recomendado)

Días de semana vs. Fines de semana

Para facilitar las gráficas que diseñamos, al momento de guardar una venta en la colección sales, debes ejecutar esta lógica en tu código de React:

const today = new Date().getDay();
// 0 es Domingo, 6 es Sábado
const dayType = (today === 0 || today === 6) ? 'weekend' : 'weekday';

Reportes por Tienda

Para obtener los datos de una tienda específica, simplemente haz un filtro donde storeId == "{ID_DE_LA_TIENDA}".

Bonos por Productividad

Filtra la colección sales por userId y suma el campo total dentro del rango de fechas deseado.
