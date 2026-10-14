# Escenarios de prueba de la app (base de desarrollo)

Creados el 08/10/2026 con `API/supabase/scripts/escenarios_app.sql`. Cliente: **[PRUEBA APP] Cliente**. Cada QR se pega en el escáner de la app (entrada manual) o se escanea desde la remisión del pedido.

| # | Escenario | Folio | Estado inicial | Saldo | QR |
|---|---|---|---|---|---|
| 1 | Liquidado y listo (confirmar entrega) | PF-TZE4LS | READY_FOR_DELIVERY | $0.00 | `94c86068-b5eb-468c-baa1-b5c879fef5d5` |
| 2 | Con saldo $360 (rojo; luego pago en el momento) | PF-FZSSCU | READY_FOR_DELIVERY | $360.00 | `aa9287a4-ca82-44fc-b5d8-005b3bd1a020` |
| 4 | En producción | PF-MWEEZX | IN_PRODUCTION | $450.00 | `2942196d-6c2e-4766-90e0-5cc87c92cdd7` |
| 5 | Pendiente de anticipo | PF-9KDWYY | PENDING_DEPOSIT | $900.00 | `b276b489-e98e-4f79-92f1-b140478452ac` |
| 6 | Cancelado | PF-T2YDND | CANCELLED | $450.00 | `52d68ae0-e2da-4f8a-b71c-5d5e9ac4a81c` |
| 7 | Ya entregado | PF-FEJV57 | DELIVERED | $0.00 | `1fd682f8-8eb2-439d-a034-87b157bc9e4b` |
| 8 | Entregado con crédito | PF-QSCBLW | DELIVERED | $360.00 | `365a0f4e-b4ac-47e1-bc89-d5bd4751bf38` |
| 12 | Lectura vieja (esperar 60 s) | PF-DQ5DAR | READY_FOR_DELIVERY | $0.00 | `6b4dbc75-407f-47d4-9138-def8726e3a4b` |
| 13 | Doble toque al confirmar | PF-KGMHDC | READY_FOR_DELIVERY | $0.00 | `1aea9777-4c0b-4621-914c-da64b8462595` |
| 14 | Red cae al confirmar | PF-9TH7FF | READY_FOR_DELIVERY | $0.00 | `d3373e68-6cae-40e3-9fd5-ea33d90b6f5e` |
| 9 | QR inexistente | — | — | — | `00000000-0000-4000-8000-000000000000` |
| 10 | Código basura | — | — | — | `HOLA-123` |

Al terminar las pruebas: cancelar los pedidos abiertos y desactivar el cliente.
