# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Three roles used with equal weight, each with a distinct job:

- **Comprador**: resident of a specific covered municipality in El Salvador ordering from nearby local vendors for delivery.
- **Vendedor**: small local business/PyME (panaderías, tiendas, etc.) that needs an online sales channel without building its own delivery logistics.
- **Repartidor**: local delivery driver picking up available orders and earning per delivery.

A fourth role, **Admin**, operates the platform (approves vendedor/repartidor role requests, moderates users/products/orders) but is not a target audience for growth — admins cannot place orders on the platform.

## Product Purpose

[SV]Go (SVGO) is a hyperlocal delivery marketplace for El Salvador connecting small local vendors, nearby buyers, and independent delivery drivers within specific covered municipalities. Success means small vendors get a viable online sales channel, buyers get fast local delivery, and repartidores get flexible income — all within a community-anchored, not regional-scale, footprint.

## Positioning

Unlike regional platforms (Uber Eats, PedidosYa) built for high-volume, high-commission scale, [SV]Go is designed from the ground up for small vendors in specific municipalities those platforms don't consider profitable. The differentiation is business-model-level, not UI-level:

- **Low commission, hyperlocal focus**: built for small vendors in specific municipios, not regional scale.
- **Own wallet + simulated payment gateway**: internal wallet system with automatic refunds and transaction control, not a dependency on third-party payment processors.
- **Community micro-investment**: community members invest directly in local vendors, making them stakeholders rather than only customers — an economic mechanism, not a UI feature.
- **Integrated mentorship/training**: the platform accompanies vendor growth with ongoing content and relationship, not just a sales channel.

Together this forms an ecosystem (community + commerce + investment + education) that a traditional delivery app cannot replicate without changing its entire business model.

## Operating Context

- Two parallel implementations of the same product: a React + Vite web app (`apps/web/web`, all 4 roles) and a React Native/Expo mobile app (`apps/mobile/frontend`, Comprador/Vendedor/Repartidor/Admin), sharing one PHP/MySQL backend (`apps/mobile/backend`).
- Order pipeline: comprador checkout → vendedor confirms/prepares → repartidor pool picks up (or vendedor assigns directly) → delivery confirmation on both sides → completed, with wallet/commission settlement.
- Role upgrade flow: comprador/vendedor/repartidor role requests go through DUI-photo verification, reviewed and approved/rejected by Admin.
- Coverage is enforced at checkout: `municipios_sv.cobertura_activa` gates whether an address can be delivered to at all — this is a real business constraint, not just a UI filter.

## Capabilities and Constraints

- Only municipalities marked with active coverage (`cobertura_activa`) can receive orders; this must be respected by any future ordering/coverage-related design work.
- Admins cannot place orders and cannot change their own role/status (only another admin can); this is an enforced business rule, not a UI-only restriction.
- Payment methods: tarjeta (sandboxed/simulated gateway, Luhn-validated), efectivo (cash on delivery), and an internal wallet with automatic refunds.
- Community micro-investment and vendor mentorship/training are confirmed product-strategy pillars; current codebase exploration did not surface a built micro-investment or mentorship feature yet — treat as durable product truth/roadmap, not yet confirmed as shipped UI.

## Brand Commitments

- Name and brand are fixed: **[SV]Go** (also referenced internally as **SVGO**). Do not rename or rebrand without explicit request.
- Existing visual identity (blue accent `#4A6D8C` / `#355068`, established across the current web app) is a binding brand commitment, not just an incumbent default — preserve unless the user explicitly asks to change it.

## Product Principles

1. Hyperlocal over regional scale: design and business logic favor specific municipios and small vendors, not maximum coverage.
2. Community as stakeholder: buyers and community members can be investors in local vendors, not only customers — this relationship should read in the product, not just be a backend mechanism.
3. Own the financial rails: wallet, refunds, and payment simulation are core infrastructure, not a thin wrapper over a third party.
4. Vendor success is a platform responsibility: mentorship/training accompany the sales channel — the platform is a partner, not just a marketplace.
5. Coverage is a hard constraint: never design flows that imply delivery is available outside active-coverage municipios.

## Accessibility & Inclusion

[No product-specific accessibility requirement was established in this session; standard web/mobile accessibility practices apply unless the user specifies otherwise.]
