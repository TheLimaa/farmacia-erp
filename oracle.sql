-- ==========================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS (ORACLE XE)
-- SISTEMA INTEGRAL DE GESTIÓN FARMACÉUTICA
-- ==========================================================

-- 1. TABLAS MAESTRAS (Sin dependencias externas)

CREATE TABLE sucursal (
    id_sucursal NUMBER(10) PRIMARY KEY,
    nombre_ubicacion VARCHAR2(150) NOT NULL,
    tipo_ubicacion VARCHAR2(50) NOT NULL
);

CREATE TABLE medicamento (
    id_medicamento NUMBER(10) PRIMARY KEY,
    nombre_comercial VARCHAR2(150) NOT NULL,
    precio_unitario NUMBER(10,2) NOT NULL
);

CREATE TABLE cliente (
    id_cliente NUMBER(10) PRIMARY KEY,
    nombre_completo VARCHAR2(150) NOT NULL,
    telefono_contacto VARCHAR2(20)
);

-- 2. TABLAS DE RECURSOS HUMANOS Y ACCESO (Dependen de Sucursal)

CREATE TABLE empleado (
    id_empleado NUMBER(10) PRIMARY KEY,
    id_sucursal NUMBER(10) NOT NULL,
    nombre_completo VARCHAR2(150) NOT NULL,
    salario_base NUMBER(10,2) NOT NULL,
    CONSTRAINT fk_empleado_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal)
);

CREATE TABLE usuario_sistema (
    id_usuario NUMBER(10) PRIMARY KEY,
    id_empleado NUMBER(10) NOT NULL,
    nombre_usuario VARCHAR2(50) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    rol VARCHAR2(50) NOT NULL,
    ultimo_acceso TIMESTAMP,
    CONSTRAINT fk_usuario_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
);

CREATE TABLE pago_planilla (
    id_pago NUMBER(10) PRIMARY KEY,
    id_empleado NUMBER(10) NOT NULL,
    fecha_pago DATE NOT NULL,
    monto_pagado NUMBER(10,2) NOT NULL,
    descuentos NUMBER(10,2) DEFAULT 0,
    mes_correspondiente VARCHAR2(20) NOT NULL,
    CONSTRAINT fk_pago_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
);

-- 3. TABLAS DE INVENTARIO Y ACTIVOS (Dependen de Medicamento y Sucursal)

CREATE TABLE inventario_lote (
    id_lote NUMBER(10) PRIMARY KEY,
    id_medicamento NUMBER(10) NOT NULL,
    id_sucursal NUMBER(10) NOT NULL,
    cantidad NUMBER(10) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    CONSTRAINT fk_lote_medicamento FOREIGN KEY (id_medicamento) REFERENCES medicamento(id_medicamento),
    CONSTRAINT fk_lote_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal)
);

CREATE TABLE activo_fijo (
    id_activo NUMBER(10) PRIMARY KEY,
    id_sucursal NUMBER(10) NOT NULL,
    descripcion VARCHAR2(200) NOT NULL,
    valor_inicial NUMBER(10,2) NOT NULL,
    CONSTRAINT fk_activo_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal)
);

-- 4. TABLAS DE CAJA Y FINANZAS (Dependen de Sucursal)

CREATE TABLE caja_sucursal (
    id_caja NUMBER(10) PRIMARY KEY,
    id_sucursal NUMBER(10) NOT NULL,
    saldo_apertura NUMBER(10,2) NOT NULL,
    saldo_actual NUMBER(10,2) NOT NULL,
    fecha_corte DATE,
    CONSTRAINT fk_caja_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal)
);

CREATE TABLE movimiento_caja (
    id_movimiento NUMBER(10) PRIMARY KEY,
    id_caja NUMBER(10) NOT NULL,
    tipo_movimiento VARCHAR2(20) NOT NULL, -- 'Ingreso' o 'Egreso'
    monto NUMBER(10,2) NOT NULL,
    concepto VARCHAR2(255) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimiento_caja FOREIGN KEY (id_caja) REFERENCES caja_sucursal(id_caja)
);

-- 5. TABLAS DE VENTAS (Dependen de Sucursal, Empleado y Medicamento)

CREATE TABLE venta (
    id_venta NUMBER(10) PRIMARY KEY,
    id_sucursal NUMBER(10) NOT NULL,
    id_empleado NUMBER(10) NOT NULL,
    total NUMBER(10,2) NOT NULL,
    metodo_pago VARCHAR2(50) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_venta_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_venta_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
);

CREATE TABLE detalle_venta (
    id_detalle NUMBER(10) PRIMARY KEY,
    id_venta NUMBER(10) NOT NULL,
    id_medicamento NUMBER(10) NOT NULL,
    cantidad_vendida NUMBER(10) NOT NULL,
    subtotal NUMBER(10,2) NOT NULL,
    CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    CONSTRAINT fk_detalle_medicamento FOREIGN KEY (id_medicamento) REFERENCES medicamento(id_medicamento)
);

-- 6. TABLAS DE LOGÍSTICA E INVENTARIO INTERNO (Traslados)

CREATE TABLE traslado_interno (
    id_traslado NUMBER(10) PRIMARY KEY,
    id_suc_origen NUMBER(10) NOT NULL,
    id_suc_destino NUMBER(10) NOT NULL,
    estado_traslado VARCHAR2(50) NOT NULL,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_traslado_origen FOREIGN KEY (id_suc_origen) REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_traslado_destino FOREIGN KEY (id_suc_destino) REFERENCES sucursal(id_sucursal)
);

CREATE TABLE detalle_traslado (
    id_detalle_tras NUMBER(10) PRIMARY KEY,
    id_traslado NUMBER(10) NOT NULL,
    id_medicamento NUMBER(10) NOT NULL,
    cantidad_trasladada NUMBER(10) NOT NULL,
    CONSTRAINT fk_dettra_traslado FOREIGN KEY (id_traslado) REFERENCES traslado_interno(id_traslado),
    CONSTRAINT fk_dettra_medicamento FOREIGN KEY (id_medicamento) REFERENCES medicamento(id_medicamento)
);

-- 7. TABLAS DE DELIVERY Y CALL CENTER (Dependen de Cliente, Sucursal y Empleado)

CREATE TABLE pedido_entrega (
    id_pedido NUMBER(10) PRIMARY KEY,
    id_cliente NUMBER(10) NOT NULL,
    id_sucursal_despacho NUMBER(10) NOT NULL,
    id_repartidor NUMBER(10) NOT NULL,
    estado_pedido VARCHAR2(50) NOT NULL,
    metodo_pago_acordado VARCHAR2(50) NOT NULL,
    costo_envio NUMBER(10,2) DEFAULT 0,
    fecha_hora_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    CONSTRAINT fk_pedido_sucursal FOREIGN KEY (id_sucursal_despacho) REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_pedido_repartidor FOREIGN KEY (id_repartidor) REFERENCES empleado(id_empleado)
);