export type Lang = 'es' | 'en' | 'fr';

export interface Translations {
  onboarding: {
    roleTitle: string;
    roleSub: string;
    roles: { comprador: string; vendedor: string; repartidor: string };
    roleDesc: { comprador: string; vendedor: string; repartidor: string };
    continuar: string;
    slides: { titulo: string; descripcion: string }[];
    siguiente: string;
    comenzar: string;
  };
  location: {
    titulo: string;
    subtitulo: string;
    buscar: string;
    continuar: string;
  };
  phone: {
    titulo: string;
    subtitulo: string;
    placeholder: string;
    continuar: string;
    omitir: string;
    nota: string;
  };
  auth: {
    iniciar: string;
    registro: string;
    usuarioEmailTelefono: string;
    contrasena: string;
    iniciarSesion: string;
    nombreCompleto: string;
    email: string;
    telefonoLabel: string;
    crearCuenta: string;
    oContinuaCon: string;
    continuarGoogle: string;
    continuarApple: string;
    datosRequeridos: string;
    ingresaCredenciales: string;
    completaCampos: string;
    tagline: string;
    bienvenido: string;
    unete: string;
    subtLogin: string;
    subtRegister: string;
    terminos: string;
    emailInvalido: string;
    contrasenaCorta: string;
    confirmarContrasena: string;
    contrasenasNoCoinciden: string;
    googleNoConfigurado: string;
    sinConexion: string;
    username: string;
    usernamePlaceholder: string;
    usernameDisponible: string;
    usernameOcupado: string;
  };
  home: {
    entregarEn: string;
    buscarPlaceholder: string;
    sinProductos: string;
    banners: { titulo: string; sub: string }[];
    tiendas: string;
    populares: string;
    nuevos: string;
  };
  product: {
    detalle: string;
    descripcion: string;
    sinDescripcion: string;
    cuantosOrdenar: string;
    anadirCarrito: string;
    contactarVendedor: string;
    productoNoEncontrado: string;
    cargandoProducto: string;
    agregado: string;
  };
  cart: {
    miCarrito: string;
    carritoVacio: string;
    carritoVacioSub: string;
    subtotal: string;
    costoEnvio: string;
    gratis: string;
    totalEstimado: string;
    procederPago: string;
    confirmarPedido: string;
    direccionEntrega: string;
    direccionPlaceholder: string;
    metodoPago: string;
    efectivo: string;
    tarjeta: string;
    paypal: string;
    pagar: string;
    pedidoCreado: string;
    pedidoCreadoMsg: string;
    ingresaDireccion: string;
    explorar: string;
  };
  payment: {
    seleccionaMetodo: string;
    pagoSeguro: string;
    procesando: string;
    exito: string;
    exitoMsg: string;
    numeroTarjeta: string;
    nombreTarjeta: string;
    vencimiento: string;
    cvv: string;
    luhnError: string;
    cvvHint: string;
    paypalEmail: string;
    paypalPass: string;
    codigo2fa: string;
    enviarCodigo: string;
    verificar: string;
    recibo: string;
    referencia: string;
    fecha: string;
    volverInicio: string;
  };
  tracking: {
    pedido: string;
    cargando: string;
    llegara: string;
    minutos: string;
    segundos: string;
    etapas: { preparando: string; enCamino: string; enRuta: string; entregado: string };
    tienda: string;
    entrega: string;
    repartidor: string;
    tiempo: string;
    trafico: string;
    total: string;
  };
  chat: {
    mensajes: string;
    todos: string;
    noLeidos: string;
    archivados: string;
    iniciarConv: string;
    sinMensajes: string;
    sinMensajesSub: string;
    escribir: string;
    hoy: string;
    ayer: string;
    leido: string;
  };
  profile: {
    usuario: string;
    convertirseEnSocio: string;
    soporteAyuda: string;
    cerrarSesion: string;
    pedidos: string;
    guardados: string;
    meGusta: string;
    idioma: string;
    modoOscuro: string;
    notificaciones: string;
    privacidad: string;
    configuracion: string;
    proximamente: string;
    editarPerfil: string;
    foto: string;
    contrasenaActual: string;
    contrasenaNueva: string;
    guardarCambios: string;
    horarioApertura: string;
    horarioCierre: string;
    categoriaTienda: string;
    portadaTienda: string;
    usuarioBloqueado: string;
    diasParaCambiar: string;
  };
  usernameSetup: {
    titulo: string;
    subtitulo: string;
    placeholder: string;
    confirmar: string;
    minCaracteres: string;
    soloLetras: string;
  };
  support: {
    titulo: string;
    preguntasFrecuentes: string;
    chatVivo: string;
    email: string;
    pregunta1: string;
    respuesta1: string;
    pregunta2: string;
    respuesta2: string;
    pregunta3: string;
    respuesta3: string;
    emailSoporte: string;
  };
  driver: {
    enLinea: string;
    fueraLinea: string;
    gananciasHoy: string;
    gananciasSemanales: string;
    gananciasTotal: string;
    entregasHoy: string;
  };
  common: {
    error: string;
    exito: string;
    cargando: string;
    falloRed: string;
    volver: string;
    cancelar: string;
    aceptar: string;
    guardar: string;
    opcional: string;
    confirmar: string;
    eliminar: string;
    si: string;
    no: string;
  };
  network: { offline: string; reintentando: string; sinConexionTitulo: string };
  admin: {
    panel: string;
    volverWeb: string;
    arbolControl: string;
    usuarios: string;
    productos: string;
    reels: string;
    banear: string;
    desbanear: string;
    eliminar: string;
    pedidos: string;
    solicitudes: string;
    confirmBan: string;
    confirmDelete: string;
  };
  seller: {
    tituloProducto: string;
    descripcionProducto: string;
    categoriaProducto: string;
    precio: string;
    stock: string;
    agotado: string;
    pedidoNuevo: string;
    repartidorAsignado: string;
    sinRepartidor: string;
    contactarRepartidor: string;
    vehiculo: string;
    placa: string;
    rechazarPedido: string;
  };
  pago: {
    procesando: string;
    pasarela: string;
    pagar: string;
    revertido: string;
    canceladoPorVendedor: string;
    sinRepartidorTimeout: string;
    aceptadoPor: string;
    esperandoRepartidor: string;
    eta: string;
    califica: string;
    comentario: string;
    gracias: string;
    cancelar: string;
  };
  reels: {
    seguir: string;
    siguiendo: string;
    comentar: string;
    compartir: string;
    responder: string;
    sinComentarios: string;
    msgAutomatico: string;
  };
  cart2: {
    bloqueoTiendaTitulo: string;
    bloqueoTiendaMsg: string;
    vaciar: string;
  };
}

const es: Translations = {
  onboarding: {
    roleTitle: 'Bienvenido a [SV]Go',
    roleSub: 'Selecciona cómo deseas usar la plataforma',
    roles: { comprador: 'Comprador', vendedor: 'Vendedor', repartidor: 'Repartidor' },
    roleDesc: {
      comprador: 'Explora productos locales y recibe pedidos en casa',
      vendedor: 'Publica productos y gestiona tu tienda digital',
      repartidor: 'Acepta entregas y genera ingresos flexibles',
    },
    continuar: 'Continuar',
    slides: [
      { titulo: 'Compra Local en El Salvador', descripcion: 'Productos de tiendas cercanas a tu municipio, frescos y a buen precio.' },
      { titulo: 'Entregas a Domicilio', descripcion: 'Repartidores certificados llevan tu pedido directo a tu puerta.' },
      { titulo: 'Ofertas y Reels Exclusivos', descripcion: 'Descubre productos en videos cortos y aprovecha promociones diarias.' },
      { titulo: 'Seguimiento en Vivo', descripcion: 'Sigue tu pedido en tiempo real con tiempos de llegada y tráfico.' },
    ],
    siguiente: 'Siguiente',
    comenzar: 'Comenzar',
  },
  location: {
    titulo: 'Selecciona tu ubicación',
    subtitulo: 'Elige tu municipio para ver productos cerca de ti',
    buscar: 'Buscar municipio...',
    continuar: 'Continuar',
  },
  phone: {
    titulo: 'Vincula tu teléfono',
    subtitulo: 'Añade tu número para recibir actualizaciones de pedidos y verificar tu cuenta',
    placeholder: '7000-0000',
    continuar: 'Vincular número',
    omitir: 'Omitir por ahora',
    nota: 'Solo se usa para notificaciones. No compartimos tu número.',
  },
  auth: {
    iniciar: 'Iniciar Sesión',
    registro: 'Crear Cuenta',
    usuarioEmailTelefono: 'Usuario, email o teléfono',
    contrasena: 'Contraseña',
    iniciarSesion: 'Iniciar Sesión',
    nombreCompleto: 'Nombre completo',
    email: 'Correo electrónico',
    telefonoLabel: 'Teléfono',
    crearCuenta: 'Crear cuenta',
    oContinuaCon: 'O continúa con',
    continuarGoogle: 'Google',
    continuarApple: 'Apple',
    datosRequeridos: 'Campos requeridos',
    ingresaCredenciales: 'Ingresa tus credenciales',
    completaCampos: 'Completa todos los campos',
    tagline: 'La plataforma integral de El Salvador',
    bienvenido: 'Bienvenido de vuelta',
    unete: 'Únete a [SV]Go',
    subtLogin: 'Ingresa tus credenciales para continuar',
    subtRegister: 'Crea tu cuenta gratis y empieza a comprar',
    terminos: 'Al registrarte aceptas nuestros Términos de Servicio y Política de Privacidad',
    emailInvalido: 'Correo electrónico no válido',
    contrasenaCorta: 'La contraseña debe tener al menos 6 caracteres',
    confirmarContrasena: 'Confirmar contraseña',
    contrasenasNoCoinciden: 'Las contraseñas no coinciden',
    googleNoConfigurado: 'Google Sign-In no está configurado en este entorno',
    sinConexion: 'Verifica tu conexión a internet',
    username: 'Nombre de usuario',
    usernamePlaceholder: '@tusername',
    usernameDisponible: 'Nombre de usuario disponible',
    usernameOcupado: 'Nombre de usuario no disponible',
  },
  home: {
    entregarEn: 'Entregar en',
    buscarPlaceholder: '¿Qué se te antoja hoy?',
    sinProductos: 'Sin productos en esta categoría',
    banners: [
      { titulo: 'Pupusas Artesanales', sub: 'Envío gratis en tu primer pedido' },
      { titulo: 'Café de Altura', sub: 'Directo de las fincas salvadoreñas' },
      { titulo: 'Pan Horneado Hoy', sub: 'Panadería tradicional a domicilio' },
    ],
    tiendas: 'Tiendas destacadas',
    populares: 'Más populares',
    nuevos: 'Recién llegados',
  },
  product: {
    detalle: 'Detalle del Producto',
    descripcion: 'Descripción',
    sinDescripcion: 'Este producto no cuenta con descripción detallada.',
    cuantosOrdenar: '¿Cuántos deseas ordenar?',
    anadirCarrito: 'Añadir al carrito',
    contactarVendedor: 'Contactar al vendedor',
    productoNoEncontrado: 'Producto no encontrado',
    cargandoProducto: 'Cargando producto',
    agregado: 'Producto agregado al carrito',
  },
  cart: {
    miCarrito: 'Mi Carrito',
    carritoVacio: 'Tu carrito está vacío',
    carritoVacioSub: 'Agrega productos de tiendas cercanas para comenzar',
    subtotal: 'Subtotal',
    costoEnvio: 'Envío',
    gratis: 'Gratis',
    totalEstimado: 'Total',
    procederPago: 'Proceder al pago',
    confirmarPedido: 'Confirmar pedido',
    direccionEntrega: 'Dirección de entrega',
    direccionPlaceholder: 'Ej. Calle Arce 123, Colonia Escalón',
    metodoPago: 'Método de pago',
    efectivo: 'Efectivo al recibir',
    tarjeta: 'Tarjeta de crédito/débito',
    paypal: 'PayPal',
    pagar: 'Pagar',
    pedidoCreado: 'Pedido creado',
    pedidoCreadoMsg: 'Tu pedido fue registrado correctamente',
    ingresaDireccion: 'Ingresa tu dirección de entrega',
    explorar: 'Explorar productos',
  },
  payment: {
    seleccionaMetodo: 'Selecciona un método de pago',
    pagoSeguro: 'Pago seguro',
    procesando: 'Procesando tu pago...',
    exito: 'Pago exitoso',
    exitoMsg: 'Tu pago fue procesado correctamente',
    numeroTarjeta: 'Número de tarjeta',
    nombreTarjeta: 'Nombre del titular',
    vencimiento: 'Vencimiento (MM/AA)',
    cvv: 'CVV',
    luhnError: 'Número de tarjeta no válido',
    cvvHint: 'Los 3 dígitos al reverso de tu tarjeta',
    paypalEmail: 'Correo PayPal',
    paypalPass: 'Contraseña PayPal',
    codigo2fa: 'Código de verificación',
    enviarCodigo: 'Se envió un código a tu correo PayPal',
    verificar: 'Verificar',
    recibo: 'Recibo de pago',
    referencia: 'Referencia',
    fecha: 'Fecha',
    volverInicio: 'Ver mi pedido',
  },
  tracking: {
    pedido: 'Pedido',
    cargando: 'Cargando seguimiento',
    llegara: 'Tu pedido llegará en',
    minutos: 'minutos',
    segundos: 'segundos',
    etapas: {
      preparando: 'Preparando tu pedido',
      enCamino: 'Repartidor en camino a la tienda',
      enRuta: 'Repartidor en ruta de entrega',
      entregado: 'Pedido entregado',
    },
    tienda: 'Tienda',
    entrega: 'Entrega',
    repartidor: 'Repartidor',
    tiempo: 'Tiempo',
    trafico: 'Tráfico',
    total: 'Total',
  },
  chat: {
    mensajes: 'Mensajes',
    todos: 'Todos',
    noLeidos: 'No leídos',
    archivados: 'Archivados',
    iniciarConv: 'Inicia una conversación',
    sinMensajes: 'No tienes mensajes aún',
    sinMensajesSub: 'Contacta a un vendedor desde cualquier producto para comenzar a chatear',
    escribir: 'Escribe un mensaje...',
    hoy: 'Hoy',
    ayer: 'Ayer',
    leido: 'Leído',
  },
  profile: {
    usuario: 'Usuario',
    convertirseEnSocio: 'Convertirse en Socio',
    soporteAyuda: 'Soporte y Ayuda',
    cerrarSesion: 'Cerrar Sesión',
    pedidos: 'Pedidos',
    guardados: 'Guardados',
    meGusta: 'Me gusta',
    idioma: 'Idioma',
    modoOscuro: 'Modo oscuro',
    notificaciones: 'Notificaciones',
    privacidad: 'Privacidad',
    configuracion: 'Configuración',
    proximamente: 'Próximamente',
    editarPerfil: 'Editar Perfil',
    foto: 'Foto de perfil',
    contrasenaActual: 'Contraseña actual',
    contrasenaNueva: 'Nueva contraseña',
    guardarCambios: 'Guardar cambios',
    horarioApertura: 'Hora de apertura',
    horarioCierre: 'Hora de cierre',
    categoriaTienda: 'Categoría de tienda',
    portadaTienda: 'Foto de portada',
    usuarioBloqueado: 'No puedes cambiar el usuario aún',
    diasParaCambiar: 'días para poder cambiarlo',
  },
  usernameSetup: {
    titulo: 'Elige tu @usuario',
    subtitulo: 'Tu identidad en [SV]Go. Podrás cambiarlo cada 10 días.',
    placeholder: 'tu_usuario',
    confirmar: 'Confirmar y entrar',
    minCaracteres: 'Mínimo 3 caracteres',
    soloLetras: 'Solo letras, números y guion bajo',
  },
  support: {
    titulo: 'Soporte y Ayuda',
    preguntasFrecuentes: 'Preguntas frecuentes',
    chatVivo: 'Chat en vivo',
    email: 'Email',
    pregunta1: '¿Cómo realizo un pedido?',
    respuesta1: 'Navega a la pantalla de inicio, selecciona un producto y agrégalo al carrito. Luego completa el pago con tu método preferido.',
    pregunta2: '¿Puedo cancelar mi pedido?',
    respuesta2: 'Puedes cancelar tu pedido dentro de los primeros 5 minutos después de realizarlo, siempre que el vendedor no haya iniciado la preparación.',
    pregunta3: '¿Cómo me convierto en vendedor o repartidor?',
    respuesta3: 'Dirígete a tu perfil, selecciona "Convertirse en Socio", completa el formulario con tu DUI y espera la aprobación del administrador en 24-48 horas.',
    emailSoporte: 'soporte@svgo.sv',
  },
  driver: {
    enLinea: 'En línea — Recibiendo pedidos',
    fueraLinea: 'Fuera de línea',
    gananciasHoy: 'Hoy',
    gananciasSemanales: 'Esta semana',
    gananciasTotal: 'Total',
    entregasHoy: 'Entregas hoy',
  },
  common: {
    error: 'Error',
    exito: 'Éxito',
    cargando: 'Cargando',
    falloRed: 'Fallo de red. Verifica tu conexión.',
    volver: 'Volver',
    cancelar: 'Cancelar',
    aceptar: 'Aceptar',
    guardar: 'Guardar',
    opcional: 'opcional',
    confirmar: 'Confirmar',
    eliminar: 'Eliminar',
    si: 'Sí',
    no: 'No',
  },
  network: {
    offline: 'Sin conexión; reintentando...',
    reintentando: 'Reintentando conexión',
    sinConexionTitulo: 'Sin conexión',
  },
  admin: {
    panel: 'Panel del administrador',
    volverWeb: 'Volver a la web',
    arbolControl: 'Árbol de control',
    usuarios: 'Usuarios',
    productos: 'Productos',
    reels: 'Reels',
    banear: 'Banear',
    desbanear: 'Activar',
    eliminar: 'Eliminar',
    pedidos: 'Pedidos',
    solicitudes: 'Solicitudes',
    confirmBan: '¿Confirmas el cambio de estado de esta cuenta?',
    confirmDelete: '¿Eliminar este registro permanentemente?',
  },
  seller: {
    tituloProducto: 'Nombre del producto',
    descripcionProducto: 'Descripción',
    categoriaProducto: 'Categoría',
    precio: 'Precio (US$)',
    stock: 'Stock disponible',
    agotado: 'Agotado',
    pedidoNuevo: '¡Nuevo pedido recibido!',
    repartidorAsignado: 'Repartidor asignado',
    sinRepartidor: 'Aún sin repartidor asignado',
    contactarRepartidor: 'Chat con el repartidor',
    vehiculo: 'Vehículo',
    placa: 'Placa',
    rechazarPedido: 'Rechazar pedido',
  },
  pago: {
    procesando: 'Procesando pago seguro...',
    pasarela: 'Pasarela de pagos',
    pagar: 'Pagar ahora',
    revertido: 'Saldo reintegrado a tu billetera',
    canceladoPorVendedor: 'El vendedor rechazó el pedido. Se devolvió el pago.',
    sinRepartidorTimeout: 'Ningún repartidor aceptó. Pago devuelto.',
    aceptadoPor: 'Pedido aceptado por',
    esperandoRepartidor: 'Esperando asignación de repartidor...',
    eta: 'Llega en',
    califica: 'Califica tu experiencia',
    comentario: 'Cuéntanos cómo te fue (opcional)',
    gracias: '¡Gracias por tu calificación!',
    cancelar: 'Cancelar pedido',
  },
  reels: {
    seguir: 'Seguir',
    siguiendo: 'Siguiendo',
    comentar: 'Comentar',
    compartir: 'Compartir',
    responder: 'Responder',
    sinComentarios: 'Sé el primero en comentar',
    msgAutomatico: 'Hola, vi tu producto en Reels y me interesa.',
  },
  cart2: {
    bloqueoTiendaTitulo: 'Tienda diferente',
    bloqueoTiendaMsg: 'Tu carrito ya contiene productos de otra tienda. ¿Deseas vaciarlo y continuar?',
    vaciar: 'Vaciar y continuar',
  },
};

const en: Translations = {
  onboarding: {
    roleTitle: 'Welcome to [SV]Go',
    roleSub: 'Select how you want to use the platform',
    roles: { comprador: 'Buyer', vendedor: 'Seller', repartidor: 'Driver' },
    roleDesc: {
      comprador: 'Explore local products and receive orders at home',
      vendedor: 'List products and manage your digital store',
      repartidor: 'Accept deliveries and earn flexible income',
    },
    continuar: 'Continue',
    slides: [
      { titulo: 'Shop Local in El Salvador', descripcion: 'Products from nearby stores in your municipality, fresh and affordable.' },
      { titulo: 'Home Delivery', descripcion: 'Certified drivers bring your order directly to your door.' },
      { titulo: 'Exclusive Deals & Reels', descripcion: 'Discover products in short videos and enjoy daily promotions.' },
      { titulo: 'Live Tracking', descripcion: 'Track your order in real-time with arrival times and traffic updates.' },
    ],
    siguiente: 'Next',
    comenzar: 'Get Started',
  },
  location: {
    titulo: 'Select your location',
    subtitulo: 'Choose your municipality to see products near you',
    buscar: 'Search municipality...',
    continuar: 'Continue',
  },
  phone: {
    titulo: 'Link your phone',
    subtitulo: 'Add your number to receive order updates and verify your account',
    placeholder: '7000-0000',
    continuar: 'Link number',
    omitir: 'Skip for now',
    nota: 'Only used for notifications. We never share your number.',
  },
  auth: {
    iniciar: 'Sign In',
    registro: 'Create Account',
    usuarioEmailTelefono: 'Username, email or phone',
    contrasena: 'Password',
    iniciarSesion: 'Sign In',
    nombreCompleto: 'Full name',
    email: 'Email',
    telefonoLabel: 'Phone',
    crearCuenta: 'Create account',
    oContinuaCon: 'Or continue with',
    continuarGoogle: 'Google',
    continuarApple: 'Apple',
    datosRequeridos: 'Required fields',
    ingresaCredenciales: 'Enter your credentials',
    completaCampos: 'Fill in all fields',
    tagline: 'The all-in-one platform of El Salvador',
    bienvenido: 'Welcome back',
    unete: 'Join [SV]Go',
    subtLogin: 'Enter your credentials to continue',
    subtRegister: 'Create your free account and start shopping',
    terminos: 'By signing up you accept our Terms of Service and Privacy Policy',
    emailInvalido: 'Invalid email address',
    contrasenaCorta: 'Password must be at least 6 characters',
    confirmarContrasena: 'Confirm password',
    contrasenasNoCoinciden: 'Passwords do not match',
    googleNoConfigurado: 'Google Sign-In is not configured in this environment',
    sinConexion: 'Check your internet connection',
    username: 'Username',
    usernamePlaceholder: '@yourusername',
    usernameDisponible: 'Username available',
    usernameOcupado: 'Username not available',
  },
  home: {
    entregarEn: 'Deliver to',
    buscarPlaceholder: 'What are you craving today?',
    sinProductos: 'No products in this category',
    banners: [
      { titulo: 'Artisan Pupusas', sub: 'Free shipping on your first order' },
      { titulo: 'Highland Coffee', sub: 'Direct from Salvadoran farms' },
      { titulo: 'Fresh-Baked Bread', sub: 'Traditional bakery delivered' },
    ],
    tiendas: 'Featured stores',
    populares: 'Most popular',
    nuevos: 'Newly added',
  },
  product: {
    detalle: 'Product Detail',
    descripcion: 'Description',
    sinDescripcion: 'This product does not have a detailed description yet.',
    cuantosOrdenar: 'How many would you like to order?',
    anadirCarrito: 'Add to Cart',
    contactarVendedor: 'Contact Seller',
    productoNoEncontrado: 'Product not found',
    cargandoProducto: 'Loading product',
    agregado: 'Product added to cart',
  },
  cart: {
    miCarrito: 'My Cart',
    carritoVacio: 'Your cart is empty',
    carritoVacioSub: 'Add products from nearby stores to get started',
    subtotal: 'Subtotal',
    costoEnvio: 'Shipping',
    gratis: 'Free',
    totalEstimado: 'Total',
    procederPago: 'Proceed to checkout',
    confirmarPedido: 'Confirm order',
    direccionEntrega: 'Delivery address',
    direccionPlaceholder: 'E.g. Main Street 123, Downtown',
    metodoPago: 'Payment method',
    efectivo: 'Cash on delivery',
    tarjeta: 'Credit/debit card',
    paypal: 'PayPal',
    pagar: 'Pay',
    pedidoCreado: 'Order created',
    pedidoCreadoMsg: 'Your order was registered successfully',
    ingresaDireccion: 'Enter your delivery address',
    explorar: 'Explore products',
  },
  payment: {
    seleccionaMetodo: 'Select a payment method',
    pagoSeguro: 'Secure payment',
    procesando: 'Processing your payment...',
    exito: 'Payment successful',
    exitoMsg: 'Your payment was processed successfully',
    numeroTarjeta: 'Card number',
    nombreTarjeta: 'Cardholder name',
    vencimiento: 'Expiry (MM/YY)',
    cvv: 'CVV',
    luhnError: 'Invalid card number',
    cvvHint: 'The 3 digits on the back of your card',
    paypalEmail: 'PayPal email',
    paypalPass: 'PayPal password',
    codigo2fa: 'Verification code',
    enviarCodigo: 'A code was sent to your PayPal email',
    verificar: 'Verify',
    recibo: 'Payment receipt',
    referencia: 'Reference',
    fecha: 'Date',
    volverInicio: 'View my order',
  },
  tracking: {
    pedido: 'Order',
    cargando: 'Loading tracking',
    llegara: 'Your order will arrive in',
    minutos: 'minutes',
    segundos: 'seconds',
    etapas: {
      preparando: 'Preparing your order',
      enCamino: 'Driver heading to store',
      enRuta: 'Driver on delivery route',
      entregado: 'Order delivered',
    },
    tienda: 'Store',
    entrega: 'Delivery',
    repartidor: 'Driver',
    tiempo: 'Time',
    trafico: 'Traffic',
    total: 'Total',
  },
  chat: {
    mensajes: 'Messages',
    todos: 'All',
    noLeidos: 'Unread',
    archivados: 'Archived',
    iniciarConv: 'Start a conversation',
    sinMensajes: 'No messages yet',
    sinMensajesSub: 'Contact a seller from any product to start chatting',
    escribir: 'Write a message...',
    hoy: 'Today',
    ayer: 'Yesterday',
    leido: 'Read',
  },
  profile: {
    usuario: 'User',
    convertirseEnSocio: 'Become a Partner',
    soporteAyuda: 'Support & Help',
    cerrarSesion: 'Log Out',
    pedidos: 'Orders',
    guardados: 'Saved',
    meGusta: 'Liked',
    idioma: 'Language',
    modoOscuro: 'Dark mode',
    notificaciones: 'Notifications',
    privacidad: 'Privacy',
    configuracion: 'Settings',
    proximamente: 'Coming soon',
    editarPerfil: 'Edit Profile',
    foto: 'Profile photo',
    contrasenaActual: 'Current password',
    contrasenaNueva: 'New password',
    guardarCambios: 'Save changes',
    horarioApertura: 'Opening time',
    horarioCierre: 'Closing time',
    categoriaTienda: 'Store category',
    portadaTienda: 'Cover photo',
    usuarioBloqueado: "You can't change your username yet",
    diasParaCambiar: 'days until you can change it',
  },
  usernameSetup: {
    titulo: 'Choose your @username',
    subtitulo: 'Your identity in [SV]Go. You can change it every 10 days.',
    placeholder: 'your_username',
    confirmar: 'Confirm and enter',
    minCaracteres: 'At least 3 characters',
    soloLetras: 'Only letters, numbers and underscore',
  },
  support: {
    titulo: 'Support & Help',
    preguntasFrecuentes: 'Frequently asked questions',
    chatVivo: 'Live chat',
    email: 'Email',
    pregunta1: 'How do I place an order?',
    respuesta1: 'Go to the home screen, select a product and add it to your cart. Then complete the payment with your preferred method.',
    pregunta2: 'Can I cancel my order?',
    respuesta2: 'You can cancel your order within the first 5 minutes of placing it, as long as the seller has not started preparing it.',
    pregunta3: 'How do I become a seller or driver?',
    respuesta3: 'Go to your profile, select "Become a Partner", complete the form with your ID and wait for admin approval within 24-48 hours.',
    emailSoporte: 'support@svgo.sv',
  },
  driver: {
    enLinea: 'Online — Receiving orders',
    fueraLinea: 'Offline',
    gananciasHoy: 'Today',
    gananciasSemanales: 'This week',
    gananciasTotal: 'Total',
    entregasHoy: 'Deliveries today',
  },
  common: {
    error: 'Error',
    exito: 'Success',
    cargando: 'Loading',
    falloRed: 'Network error. Check your connection.',
    volver: 'Back',
    cancelar: 'Cancel',
    aceptar: 'Accept',
    guardar: 'Save',
    opcional: 'optional',
    confirmar: 'Confirm',
    eliminar: 'Delete',
    si: 'Yes',
    no: 'No',
  },
  network: {
    offline: 'No connection; retrying...',
    reintentando: 'Retrying connection',
    sinConexionTitulo: 'No connection',
  },
  admin: {
    panel: 'Admin panel',
    volverWeb: 'Back to the app',
    arbolControl: 'Control tree',
    usuarios: 'Users',
    productos: 'Products',
    reels: 'Reels',
    banear: 'Ban',
    desbanear: 'Enable',
    eliminar: 'Delete',
    pedidos: 'Orders',
    solicitudes: 'Requests',
    confirmBan: 'Confirm changing the status of this account?',
    confirmDelete: 'Delete this record permanently?',
  },
  seller: {
    tituloProducto: 'Product name',
    descripcionProducto: 'Description',
    categoriaProducto: 'Category',
    precio: 'Price (US$)',
    stock: 'Available stock',
    agotado: 'Out of stock',
    pedidoNuevo: 'New order received!',
    repartidorAsignado: 'Assigned driver',
    sinRepartidor: 'No driver assigned yet',
    contactarRepartidor: 'Chat with the driver',
    vehiculo: 'Vehicle',
    placa: 'Plate',
    rechazarPedido: 'Reject order',
  },
  pago: {
    procesando: 'Processing secure payment...',
    pasarela: 'Payment gateway',
    pagar: 'Pay now',
    revertido: 'Balance refunded to your wallet',
    canceladoPorVendedor: 'The seller rejected the order. Payment refunded.',
    sinRepartidorTimeout: 'No driver accepted. Payment refunded.',
    aceptadoPor: 'Order accepted by',
    esperandoRepartidor: 'Waiting for driver assignment...',
    eta: 'Arrives in',
    califica: 'Rate your experience',
    comentario: 'Tell us how it went (optional)',
    gracias: 'Thanks for your rating!',
    cancelar: 'Cancel order',
  },
  reels: {
    seguir: 'Follow',
    siguiendo: 'Following',
    comentar: 'Comment',
    compartir: 'Share',
    responder: 'Reply',
    sinComentarios: 'Be the first to comment',
    msgAutomatico: "Hi, I saw your product on Reels and I'm interested.",
  },
  cart2: {
    bloqueoTiendaTitulo: 'Different store',
    bloqueoTiendaMsg: 'Your cart already has products from another store. Empty it and continue?',
    vaciar: 'Empty and continue',
  },
};

const fr: Translations = {
  onboarding: {
    roleTitle: 'Bienvenue sur [SV]Go',
    roleSub: 'Choisissez comment utiliser la plateforme',
    roles: { comprador: 'Acheteur', vendedor: 'Vendeur', repartidor: 'Livreur' },
    roleDesc: {
      comprador: 'Explorez les produits locaux et recevez vos commandes chez vous',
      vendedor: 'Publiez des produits et gérez votre boutique numérique',
      repartidor: 'Acceptez des livraisons et générez des revenus flexibles',
    },
    continuar: 'Continuer',
    slides: [
      { titulo: 'Achats locaux au Salvador', descripcion: 'Produits de magasins proches de votre commune, frais et abordables.' },
      { titulo: 'Livraison à domicile', descripcion: 'Des livreurs certifiés apportent votre commande directement chez vous.' },
      { titulo: 'Offres et Reels exclusifs', descripcion: 'Découvrez des produits en courtes vidéos et profitez de promotions quotidiennes.' },
      { titulo: 'Suivi en direct', descripcion: 'Suivez votre commande en temps réel avec les temps d\'arrivée et le trafic.' },
    ],
    siguiente: 'Suivant',
    comenzar: 'Commencer',
  },
  location: {
    titulo: 'Sélectionnez votre emplacement',
    subtitulo: 'Choisissez votre commune pour voir les produits près de vous',
    buscar: 'Rechercher une commune...',
    continuar: 'Continuer',
  },
  phone: {
    titulo: 'Liez votre téléphone',
    subtitulo: 'Ajoutez votre numéro pour recevoir des mises à jour de commandes',
    placeholder: '7000-0000',
    continuar: 'Lier le numéro',
    omitir: 'Ignorer pour l\'instant',
    nota: 'Utilisé uniquement pour les notifications. Nous ne partageons jamais votre numéro.',
  },
  auth: {
    iniciar: 'Se connecter',
    registro: 'Créer un compte',
    usuarioEmailTelefono: 'Nom d\'utilisateur, email ou téléphone',
    contrasena: 'Mot de passe',
    iniciarSesion: 'Se connecter',
    nombreCompleto: 'Nom complet',
    email: 'Email',
    telefonoLabel: 'Téléphone',
    crearCuenta: 'Créer un compte',
    oContinuaCon: 'Ou continuer avec',
    continuarGoogle: 'Google',
    continuarApple: 'Apple',
    datosRequeridos: 'Champs requis',
    ingresaCredenciales: 'Entrez vos identifiants',
    completaCampos: 'Remplissez tous les champs',
    tagline: 'La plateforme tout-en-un du Salvador',
    bienvenido: 'Content de vous revoir',
    unete: 'Rejoignez [SV]Go',
    subtLogin: 'Entrez vos identifiants pour continuer',
    subtRegister: 'Créez votre compte gratuit et commencez à acheter',
    terminos: 'En vous inscrivant, vous acceptez nos Conditions d\'utilisation et notre Politique de confidentialité',
    emailInvalido: 'Adresse email invalide',
    contrasenaCorta: 'Le mot de passe doit comporter au moins 6 caractères',
    confirmarContrasena: 'Confirmer le mot de passe',
    contrasenasNoCoinciden: 'Les mots de passe ne correspondent pas',
    googleNoConfigurado: "La connexion Google n'est pas configurée dans cet environnement",
    sinConexion: 'Vérifiez votre connexion internet',
    username: "Nom d'utilisateur",
    usernamePlaceholder: '@votrenom',
    usernameDisponible: "Nom d'utilisateur disponible",
    usernameOcupado: "Nom d'utilisateur non disponible",
  },
  home: {
    entregarEn: 'Livrer à',
    buscarPlaceholder: 'Qu\'est-ce qui vous fait envie aujourd\'hui?',
    sinProductos: 'Aucun produit dans cette catégorie',
    banners: [
      { titulo: 'Pupusas artisanales', sub: 'Livraison gratuite sur votre première commande' },
      { titulo: 'Café des hauts plateaux', sub: 'Directement des fermes salvadoriennes' },
      { titulo: 'Pain cuit du jour', sub: 'Boulangerie traditionnelle livrée' },
    ],
    tiendas: 'Boutiques vedettes',
    populares: 'Les plus populaires',
    nuevos: 'Nouvellement ajoutés',
  },
  product: {
    detalle: 'Détail du produit',
    descripcion: 'Description',
    sinDescripcion: 'Ce produit n\'a pas encore de description détaillée.',
    cuantosOrdenar: 'Combien souhaitez-vous commander?',
    anadirCarrito: 'Ajouter au panier',
    contactarVendedor: 'Contacter le vendeur',
    productoNoEncontrado: 'Produit introuvable',
    cargandoProducto: 'Chargement du produit',
    agregado: 'Produit ajouté au panier',
  },
  cart: {
    miCarrito: 'Mon Panier',
    carritoVacio: 'Votre panier est vide',
    carritoVacioSub: 'Ajoutez des produits de boutiques proches pour commencer',
    subtotal: 'Sous-total',
    costoEnvio: 'Livraison',
    gratis: 'Gratuit',
    totalEstimado: 'Total',
    procederPago: 'Passer au paiement',
    confirmarPedido: 'Confirmer la commande',
    direccionEntrega: 'Adresse de livraison',
    direccionPlaceholder: 'Ex. Rue principale 123, Centre-ville',
    metodoPago: 'Mode de paiement',
    efectivo: 'Espèces à la livraison',
    tarjeta: 'Carte de crédit/débit',
    paypal: 'PayPal',
    pagar: 'Payer',
    pedidoCreado: 'Commande créée',
    pedidoCreadoMsg: 'Votre commande a été enregistrée avec succès',
    ingresaDireccion: 'Entrez votre adresse de livraison',
    explorar: 'Explorer les produits',
  },
  payment: {
    seleccionaMetodo: 'Sélectionnez un mode de paiement',
    pagoSeguro: 'Paiement sécurisé',
    procesando: 'Traitement de votre paiement...',
    exito: 'Paiement réussi',
    exitoMsg: 'Votre paiement a été traité avec succès',
    numeroTarjeta: 'Numéro de carte',
    nombreTarjeta: 'Nom du titulaire',
    vencimiento: 'Expiration (MM/AA)',
    cvv: 'CVV',
    luhnError: 'Numéro de carte invalide',
    cvvHint: 'Les 3 chiffres au dos de votre carte',
    paypalEmail: 'Email PayPal',
    paypalPass: 'Mot de passe PayPal',
    codigo2fa: 'Code de vérification',
    enviarCodigo: 'Un code a été envoyé à votre email PayPal',
    verificar: 'Vérifier',
    recibo: 'Reçu de paiement',
    referencia: 'Référence',
    fecha: 'Date',
    volverInicio: 'Voir ma commande',
  },
  tracking: {
    pedido: 'Commande',
    cargando: 'Chargement du suivi',
    llegara: 'Votre commande arrivera dans',
    minutos: 'minutes',
    segundos: 'secondes',
    etapas: {
      preparando: 'Préparation de votre commande',
      enCamino: 'Livreur en route vers le magasin',
      enRuta: 'Livreur en route de livraison',
      entregado: 'Commande livrée',
    },
    tienda: 'Boutique',
    entrega: 'Livraison',
    repartidor: 'Livreur',
    tiempo: 'Temps',
    trafico: 'Trafic',
    total: 'Total',
  },
  chat: {
    mensajes: 'Messages',
    todos: 'Tous',
    noLeidos: 'Non lus',
    archivados: 'Archivés',
    iniciarConv: 'Démarrer une conversation',
    sinMensajes: 'Aucun message pour l\'instant',
    sinMensajesSub: 'Contactez un vendeur depuis n\'importe quel produit pour commencer à discuter',
    escribir: 'Écrivez un message...',
    hoy: 'Aujourd\'hui',
    ayer: 'Hier',
    leido: 'Lu',
  },
  profile: {
    usuario: 'Utilisateur',
    convertirseEnSocio: 'Devenir Partenaire',
    soporteAyuda: 'Support et Aide',
    cerrarSesion: 'Déconnexion',
    pedidos: 'Commandes',
    guardados: 'Sauvegardés',
    meGusta: 'Aimés',
    idioma: 'Langue',
    modoOscuro: 'Mode sombre',
    notificaciones: 'Notifications',
    privacidad: 'Confidentialité',
    configuracion: 'Paramètres',
    proximamente: 'Bientôt disponible',
    editarPerfil: 'Modifier le profil',
    foto: 'Photo de profil',
    contrasenaActual: 'Mot de passe actuel',
    contrasenaNueva: 'Nouveau mot de passe',
    guardarCambios: 'Enregistrer les modifications',
    horarioApertura: "Heure d'ouverture",
    horarioCierre: 'Heure de fermeture',
    categoriaTienda: 'Catégorie de boutique',
    portadaTienda: 'Photo de couverture',
    usuarioBloqueado: 'Vous ne pouvez pas encore changer votre nom',
    diasParaCambiar: 'jours avant de pouvoir le changer',
  },
  usernameSetup: {
    titulo: 'Choisissez votre @utilisateur',
    subtitulo: 'Votre identité sur [SV]Go. Vous pouvez le changer tous les 10 jours.',
    placeholder: 'votre_nom',
    confirmar: 'Confirmer et entrer',
    minCaracteres: 'Au moins 3 caractères',
    soloLetras: 'Lettres, chiffres et underscore seulement',
  },
  support: {
    titulo: 'Support et Aide',
    preguntasFrecuentes: 'Questions fréquentes',
    chatVivo: 'Chat en direct',
    email: 'Email',
    pregunta1: 'Comment passer une commande?',
    respuesta1: "Accédez à l'écran d'accueil, sélectionnez un produit et ajoutez-le à votre panier. Complétez ensuite le paiement avec votre méthode préférée.",
    pregunta2: 'Puis-je annuler ma commande?',
    respuesta2: "Vous pouvez annuler votre commande dans les 5 premières minutes suivant sa passation, à condition que le vendeur n'ait pas commencé la préparation.",
    pregunta3: 'Comment devenir vendeur ou livreur?',
    respuesta3: 'Allez dans votre profil, sélectionnez "Devenir Partenaire", remplissez le formulaire avec votre pièce d\'identité et attendez l\'approbation de l\'administrateur sous 24-48 heures.',
    emailSoporte: 'support@svgo.sv',
  },
  driver: {
    enLinea: 'En ligne — Reçoit des commandes',
    fueraLinea: 'Hors ligne',
    gananciasHoy: "Aujourd'hui",
    gananciasSemanales: 'Cette semaine',
    gananciasTotal: 'Total',
    entregasHoy: "Livraisons aujourd'hui",
  },
  common: {
    error: 'Erreur',
    exito: 'Succès',
    cargando: 'Chargement',
    falloRed: 'Erreur réseau. Vérifiez votre connexion.',
    volver: 'Retour',
    cancelar: 'Annuler',
    aceptar: 'Accepter',
    guardar: 'Enregistrer',
    opcional: 'optionnel',
    confirmar: 'Confirmer',
    eliminar: 'Supprimer',
    si: 'Oui',
    no: 'Non',
  },
  network: {
    offline: 'Sans connexion ; nouvelle tentative...',
    reintentando: 'Nouvelle tentative de connexion',
    sinConexionTitulo: 'Pas de connexion',
  },
  admin: {
    panel: 'Panneau administrateur',
    volverWeb: 'Retour à l\'application',
    arbolControl: 'Arborescence de contrôle',
    usuarios: 'Utilisateurs',
    productos: 'Produits',
    reels: 'Reels',
    banear: 'Bannir',
    desbanear: 'Activer',
    eliminar: 'Supprimer',
    pedidos: 'Commandes',
    solicitudes: 'Demandes',
    confirmBan: 'Confirmer le changement de statut de ce compte ?',
    confirmDelete: 'Supprimer cet enregistrement définitivement ?',
  },
  seller: {
    tituloProducto: 'Nom du produit',
    descripcionProducto: 'Description',
    categoriaProducto: 'Catégorie',
    precio: 'Prix (US$)',
    stock: 'Stock disponible',
    agotado: 'Épuisé',
    pedidoNuevo: 'Nouvelle commande reçue !',
    repartidorAsignado: 'Livreur assigné',
    sinRepartidor: 'Pas encore de livreur assigné',
    contactarRepartidor: 'Discuter avec le livreur',
    vehiculo: 'Véhicule',
    placa: 'Plaque',
    rechazarPedido: 'Refuser la commande',
  },
  pago: {
    procesando: 'Paiement sécurisé en cours...',
    pasarela: 'Passerelle de paiement',
    pagar: 'Payer maintenant',
    revertido: 'Solde remboursé sur votre portefeuille',
    canceladoPorVendedor: 'Le vendeur a refusé la commande. Paiement remboursé.',
    sinRepartidorTimeout: 'Aucun livreur n\'a accepté. Paiement remboursé.',
    aceptadoPor: 'Commande acceptée par',
    esperandoRepartidor: 'En attente d\'un livreur...',
    eta: 'Arrive dans',
    califica: 'Évaluez votre expérience',
    comentario: 'Dites-nous comment ça s\'est passé (facultatif)',
    gracias: 'Merci pour votre évaluation !',
    cancelar: 'Annuler la commande',
  },
  reels: {
    seguir: 'Suivre',
    siguiendo: 'Suivi',
    comentar: 'Commenter',
    compartir: 'Partager',
    responder: 'Répondre',
    sinComentarios: 'Soyez le premier à commenter',
    msgAutomatico: 'Bonjour, j\'ai vu votre produit sur Reels et il m\'intéresse.',
  },
  cart2: {
    bloqueoTiendaTitulo: 'Boutique différente',
    bloqueoTiendaMsg: 'Votre panier contient déjà des produits d\'une autre boutique. Le vider et continuer ?',
    vaciar: 'Vider et continuer',
  },
};

export const translations: Record<Lang, Translations> = { es, en, fr };
