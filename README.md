# FinCRM

> CRM SaaS de cobranza y gestión de flujo de caja para PYMES colombianas.

<img width="1887" height="912" alt="image" src="https://github.com/user-attachments/assets/99b8ba68-d34a-46e1-b4d6-a494f19b06e5" />


<p align="center">
  <img src="docs/fincrm-preview.png" alt="FinCRM - Vista previa del proyecto" width="900">
</p>

---

## 📌 Descripción

**FinCRM** es una plataforma web orientada a la gestión de clientes, facturación,
cobranza y flujo de caja para pequeñas y medianas empresas.

El proyecto integra un frontend desarrollado con React y un backend basado en
Node.js, con una arquitectura modular orientada a facilitar el mantenimiento,
escalabilidad y evolución de la plataforma.

Uno de sus principales enfoques es apoyar los procesos de cobranza de manera
preventiva y organizada, incorporando reglas relacionadas con la **Ley 2300 de
2023** y herramientas de automatización.

---

## 🎯 Objetivos

- Centralizar la información de clientes y cuentas por cobrar.
- Facilitar el seguimiento de facturas y pagos pendientes.
- Organizar y registrar las gestiones de cobranza.
- Controlar los contactos permitidos de acuerdo con las reglas establecidas.
- Automatizar determinadas tareas relacionadas con la cobranza.
- Proporcionar indicadores para apoyar la toma de decisiones.
- Incorporar herramientas de inteligencia artificial para asistencia y
  recomendaciones.

---

## 🚀 Características principales

### 👥 Gestión de clientes

- Registro y administración de clientes.
- Consulta de información y estado de cada cliente.
- Seguimiento de cartera.
- Gestión por organización/tenant.

### 💰 Gestión de cartera y cobranza

- Registro de gestiones de cobranza.
- Historial de contactos.
- Promesas de pago.
- Seguimiento del estado de cartera.
- Reglas asociadas a la Ley 2300.

### 🧾 Facturación

- Gestión de facturas.
- Consulta del detalle de facturación.
- Simulación de documentos DIAN.
- Visualización de respuestas y documentos.

### 🤖 Inteligencia artificial

- Chatbot de asistencia.
- Recomendaciones relacionadas con cobranza.
- Perfilamiento de riesgo.
- Generación de recomendaciones para la gestión de cartera.

### 🔐 Seguridad y usuarios

- Autenticación.
- Protección de rutas.
- Control de roles.
- Gestión de tenants.
- Módulo de administración y superadministración.

### 📊 Administración

- Dashboard administrativo.
- Gestión de organizaciones.
- Bandeja de solicitudes.
- Registro de notificaciones y correos.

---

## 🏗️ Arquitectura del proyecto

El proyecto utiliza una arquitectura monorepo que contiene frontend y backend:

```text
Fin-Crm/
│
├── backend/
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── jobs/
│   │   ├── modules/
│   │   │   ├── ai/
│   │   │   ├── auth/
│   │   │   ├── clients/
│   │   │   ├── collection/
│   │   │   ├── invoices/
│   │   │   ├── notifications/
│   │   │   ├── public/
│   │   │   ├── tenants/
│   │   │   └── webhooks/
│   │   ├── routes/
│   │   └── shared/
│   └── tests/
│
└── frontend/
    ├── public/
    └── src/
        ├── assets/
        ├── components/
        ├── context/
        ├── features/
        ├── hooks/
        ├── routes/
        ├── services/
        ├── styles/
        └── utils/
