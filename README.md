# Sistema Web de Gestion Administrativa, Ventas e Inventario para una Ferreteria

Aplicacion full-stack desarrollada con Next.js, NestJS y PostgreSQL (en Docker) para gestionar categorias, productos, inventario, clientes, proveedores, usuarios y ventas.

## Arquitectura y puertos
- Frontend (Next.js): http://localhost:3001 (carpeta /frontend)
- Backend API REST (NestJS): http://localhost:3000 (carpeta /backend)
- Base de datos (PostgreSQL 16 en Docker): localhost:5432 (contenedor ferreteria-db, base ferreteria_db)

## Funcionalidades principales
- Autenticacion con token y control de acceso por roles (ADMIN y VENDEDOR).
- Gestion de productos y categorias (alta, edicion, activacion/desactivacion y alertas de bajo stock).
- Control de inventario con entradas (IN), salidas automaticas por venta (OUT) y trazabilidad de movimientos.
- Punto de venta con carrito multi-item, alta rapida de clientes, metodo de pago (EFECTIVO / QR), comprobante imprimible y anulacion con devolucion de stock.
- Reportes detallados con exportacion/impresion a PDF y administracion de usuarios.

## Variables de entorno de ejemplo
- Backend (/backend/.env.example): PORT, NODE_ENV, DATABASE_URL, JWT_SECRET
- Frontend: NEXT_PUBLIC_API_URL=http://localhost:3000

## Ejecucion local
1. Verificar que el contenedor ferreteria-db este encendido en Docker.
2. En /backend: ejecutar npm install y npm run start:dev.
3. En /frontend: ejecutar npm install y npm run dev.

## Alcance de despliegue (Vercel vs Local)
- Frontend publicado en Vercel (interfaz web Next.js).
- Backend NestJS y base de datos PostgreSQL ejecutandose en entorno local / servidor Ubuntu Server.
