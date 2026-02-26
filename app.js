/* 
 * SISTEMA DE RECARGAS MELIODAS - FREE FIRE
 * VERSIÓN CON FIREBASE + LOCALSTORAGE + COLECCIONES COMPLETAS
 * ACTUALIZADO - FEBRERO 2026
 * CORREGIDO - REFERENCIA SISTEMA VS REFERENCIA REAL
 */

/* global firebase */

// ===== CONFIGURACIÓN INICIAL =====
const CONFIG = {
    ADMIN_EMAIL: 'luwilvitar@gmail.com',
    ADMIN_ID: '5643747321',
    TASA_DOLAR: 38.50,
    PAQUETES: [
        { diamantes: 100, precioUSD: 5, nombre: '💎𝟭𝟬𝟬💎' },
        { diamantes: 200, precioUSD: 10, nombre: '💎𝟮𝟬𝟬💎' },
        { diamantes: 300, precioUSD: 15, nombre: '💎𝟯𝟬𝟬💎' },
        { diamantes: 572, precioUSD: 25, nombre: '💎𝟱𝟮𝟬+𝟱𝟮💎' },
        { diamantes: 1155, precioUSD: 45, nombre: '💎𝟭𝟬𝟱𝟬+𝟭𝟬𝟱💎' },
        { diamantes: 2376, precioUSD: 85, nombre: '💎𝟮𝟭𝟲𝟬+𝟮𝟭𝟲💎' },
        { diamantes: 6138, precioUSD: 200, nombre: '💎𝟱𝟱𝟴𝟬+𝟱𝟱𝟴💎' }
    ]
};

// ===== DATOS DEL ADMIN PARA PAGOS =====
const DATOS_ADMIN = {
    nombreCompleto: 'Luwil Witar',
    cedula: 'V-32528448',
    
    transferencia: {
        numeroCuenta: '0191-0085-50-2185172048',
        titular: 'Luwil Witar',
        banco: 'BNC'
    },
    
    pagoMovil: {
        telefono: '04129660868',
        cedula: 'V-32528448',
        banco: 'BNC',
        bancoCodigo: '0191',
        titular: 'Luwil Witar'
    }
};

// ===== CONFIGURACIÓN DE FIREBASE =====
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAWx-aiBi1HctotUpLz2--AC0SpnG_GsQo",
    authDomain: "recargas-meliodas-f54d9.firebaseapp.com",
    projectId: "recargas-meliodas-f54d9",
    storageBucket: "recargas-meliodas-f54d9.firebasestorage.app",
    messagingSenderId: "873598040957",
    appId: "1:873598040957:web:58a728aa78a984e4642a14",
    measurementId: "G-M8L1W15RHP"
};

// ===== VARIABLES GLOBALES =====
let firebaseApp = null;
let db = null;
let auth = null;
let paqueteSeleccionado = null;
let bancoSeleccionado = null;
let pagoEnProceso = null;
let usuarioActual = null;

// ===== INICIALIZAR FIREBASE =====
function inicializarFirebase() {
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
            firebaseApp = firebase.app();
            db = firebase.firestore();
            auth = firebase.auth();
            
            // Configurar persistencia para offline
            db.enablePersistence()
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('⚠️ Persistencia múltiple no soportada');
                    } else if (err.code === 'unimplemented') {
                        console.warn('⚠️ Persistencia no soportada en este navegador');
                    }
                });
            
            console.log('✅ Firebase inicializado correctamente');
            
            // Iniciar escucha de notificaciones bancarias si es admin
            const sesion = verificarSesion();
            if (sesion && sesion.esAdmin) {
                escucharNotificacionesBancarias();
            }
        } else if (typeof firebase !== 'undefined' && firebase.apps.length) {
            db = firebase.firestore();
            auth = firebase.auth();
            console.log('✅ Firebase ya estaba inicializado');
        } else {
            console.warn('⚠️ Firebase SDK no encontrado - usando solo localStorage');
        }
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
    }
}

// ===== Cargar precios guardados =====
function cargarPreciosGuardados() {
    const preciosGuardados = localStorage.getItem('preciosPaquetes');
    if (preciosGuardados) {
        const precios = JSON.parse(preciosGuardados);
        CONFIG.PAQUETES.forEach((paquete, index) => {
            if (precios[index]) {
                paquete.precioUSD = precios[index];
            }
        });
    }
    
    const tasaGuardada = localStorage.getItem('tasaDolar');
    if (tasaGuardada) {
        CONFIG.TASA_DOLAR = parseFloat(tasaGuardada);
    }
    
    const diamantesGuardados = localStorage.getItem('diamantesPaquetes');
    if (diamantesGuardados) {
        const diamantes = JSON.parse(diamantesGuardados);
        CONFIG.PAQUETES.forEach((paquete, index) => {
            if (diamantes[index]) {
                paquete.diamantes = diamantes[index];
                actualizarNombrePaquete(paquete);
            }
        });
    }
}

// ===== ACTUALIZAR NOMBRE DEL PAQUETE SEGÚN DIAMANTES =====
function actualizarNombrePaquete(paquete) {
    const d = paquete.diamantes;
    if (d === 100) paquete.nombre = '💎𝟭𝟬𝟬💎';
    else if (d === 200) paquete.nombre = '💎𝟮𝟬𝟬💎';
    else if (d === 300) paquete.nombre = '💎𝟯𝟬𝟬💎';
    else if (d === 572) paquete.nombre = '💎𝟱𝟮𝟬+𝟱𝟮💎';
    else if (d === 1155) paquete.nombre = '💎𝟭𝟬𝟱𝟬+𝟭𝟬𝟱💎';
    else if (d === 2376) paquete.nombre = '💎𝟮𝟭𝟲𝟬+𝟮𝟭𝟲💎';
    else if (d === 6138) paquete.nombre = '💎𝟱𝟱𝟴𝟬+𝟱𝟱𝟴💎';
    else paquete.nombre = `💎${d}💎`;
}

// ===== Guardar configuraciones =====
function guardarPrecios() {
    const precios = CONFIG.PAQUETES.map(p => p.precioUSD);
    localStorage.setItem('preciosPaquetes', JSON.stringify(precios));
}

function guardarDiamantes() {
    const diamantes = CONFIG.PAQUETES.map(p => p.diamantes);
    localStorage.setItem('diamantesPaquetes', JSON.stringify(diamantes));
}

function guardarTasa() {
    localStorage.setItem('tasaDolar', CONFIG.TASA_DOLAR.toString());
}

// ===== ACTUALIZAR PRECIOS EN BS =====
function actualizarPreciosBsEnAdmin() {
    CONFIG.PAQUETES.forEach((paquete, index) => {
        const precioBsEl = document.getElementById(`precioBs_${paquete.diamantes}`);
        if (precioBsEl) {
            const precioBs = paquete.precioUSD * CONFIG.TASA_DOLAR;
            precioBsEl.textContent = precioBs.toFixed(2);
        }
    });
}

// ===== INICIALIZAR BASE DE DATOS LOCAL =====
function inicializarDB() {
    console.log('🔧 Inicializando base de datos...');
    
    if (!localStorage.getItem('usuarios')) {
        const adminInicial = {
            id: generarId(),
            nombreReal: 'Luwil',
            apellidoReal: 'Witar',
            idJugador: CONFIG.ADMIN_ID,
            fechaRegistro: new Date().toISOString(),
            esAdmin: true
        };
        localStorage.setItem('usuarios', JSON.stringify([adminInicial]));
        console.log('✅ Admin inicial creado');
        
        // Sincronizar con Firebase
        sincronizarUsuarioFirebase(adminInicial);
    } else {
        let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
        const adminExistente = usuarios.find(u => u.idJugador === CONFIG.ADMIN_ID);
        
        if (!adminExistente) {
            const nuevoAdmin = {
                id: generarId(),
                nombreReal: 'Luwil',
                apellidoReal: 'Witar',
                idJugador: CONFIG.ADMIN_ID,
                fechaRegistro: new Date().toISOString(),
                esAdmin: true
            };
            usuarios.push(nuevoAdmin);
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            console.log('✅ Admin creado');
            sincronizarUsuarioFirebase(nuevoAdmin);
        } else {
            // Asegurar que admin está en Firebase
            sincronizarUsuarioFirebase(adminExistente);
        }
    }
    
    cargarPreciosGuardados();
    
    if (!localStorage.getItem('pines')) {
        localStorage.setItem('pines', JSON.stringify([]));
    } else {
        // Sincronizar pines con Firebase
        sincronizarPinesFirebase();
    }
    
    if (!localStorage.getItem('pagos')) {
        localStorage.setItem('pagos', JSON.stringify([]));
    } else {
        // Sincronizar pagos con Firebase
        sincronizarPagosFirebase();
    }
    
    if (!localStorage.getItem('sesionActual')) {
        localStorage.setItem('sesionActual', JSON.stringify(null));
    } else {
        usuarioActual = JSON.parse(localStorage.getItem('sesionActual'));
    }
}

// ===== SINCRONIZAR USUARIO CON FIREBASE =====
async function sincronizarUsuarioFirebase(usuario) {
    if (!db) return;
    
    try {
        await db.collection('usuarios').doc(usuario.idJugador).set({
            ...usuario,
            sincronizado: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Usuario sincronizado con Firebase:', usuario.idJugador);
    } catch (error) {
        console.error('❌ Error sincronizando usuario:', error);
    }
}

// ===== SINCRONIZAR PINES CON FIREBASE =====
async function sincronizarPinesFirebase() {
    if (!db) return;
    
    try {
        const pines = JSON.parse(localStorage.getItem('pines')) || [];
        const batch = db.batch();
        
        pines.forEach(pin => {
            const pinRef = db.collection('pines').doc(pin.id);
            batch.set(pinRef, {
                ...pin,
                sincronizado: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
        
        await batch.commit();
        console.log(`✅ ${pines.length} pines sincronizados con Firebase`);
    } catch (error) {
        console.error('❌ Error sincronizando pines:', error);
    }
}

// ===== SINCRONIZAR PAGOS CON FIREBASE =====
async function sincronizarPagosFirebase() {
    if (!db) return;
    
    try {
        const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
        const batch = db.batch();
        
        pagos.forEach(pago => {
            const pagoRef = db.collection('pagos').doc(pago.numeroReferencia);
            batch.set(pagoRef, {
                ...pago,
                sincronizado: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
        
        await batch.commit();
        console.log(`✅ ${pagos.length} pagos sincronizados con Firebase`);
    } catch (error) {
        console.error('❌ Error sincronizando pagos:', error);
    }
}

// ===== GENERAR ID ÚNICO =====
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ===== GENERAR REFERENCIA DEL SISTEMA =====
function generarReferenciaSistema() {
    const timestamp = Date.now().toString().slice(-9);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return timestamp + random;
}

// ===== VERIFICAR SI REFERENCIA DEL SISTEMA YA EXISTE =====
function referenciaSistemaYaExiste(referencia, excluirReferencia = null) {
    const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    return pagos.some(p => 
        p.numeroReferencia === referencia && 
        p.numeroReferencia !== excluirReferencia
    );
}

// ===== VERIFICAR SI REFERENCIA REAL YA EXISTE =====
function referenciaRealYaExiste(referenciaReal, excluirReferencia = null) {
    const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    return pagos.some(p => 
        p.referenciaReal === referenciaReal && 
        p.numeroReferencia !== excluirReferencia
    );
}

// ===== REGISTRAR USUARIO =====
function registrarUsuario(event) {
    event.preventDefault();
    
    const nombreReal = document.getElementById('nombreReal');
    const apellidoReal = document.getElementById('apellidoReal');
    const idJugador = document.getElementById('idJugador');
    
    if (!nombreReal || !apellidoReal || !idJugador) {
        alert('Error en el formulario');
        return;
    }
    
    const nombreValor = nombreReal.value.trim();
    const apellidoValor = apellidoReal.value.trim();
    const idValor = idJugador.value.trim();
    
    if (!nombreValor || !apellidoValor || !idValor) {
        alert('❌ Por favor completa todos los campos');
        return;
    }
    
    const esAdmin = (idValor === CONFIG.ADMIN_ID);
    
    const usuario = {
        id: generarId(),
        nombreReal: nombreValor,
        apellidoReal: apellidoValor,
        idJugador: idValor,
        fechaRegistro: new Date().toISOString(),
        esAdmin: esAdmin
    };
    
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    const existe = usuarios.find(u => u.idJugador === usuario.idJugador);
    if (existe) {
        if (idValor === CONFIG.ADMIN_ID && !existe.esAdmin) {
            existe.esAdmin = true;
            existe.nombreReal = nombreValor;
            existe.apellidoReal = apellidoValor;
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            localStorage.setItem('sesionActual', JSON.stringify(existe));
            usuarioActual = existe;
            
            // Sincronizar con Firebase
            sincronizarUsuarioFirebase(existe);
            
            alert('✅ Admin actualizado');
            window.location.href = './admin.html';
            return;
        }
        alert('❌ Este ID ya está registrado');
        return;
    }
    
    usuarios.push(usuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    localStorage.setItem('sesionActual', JSON.stringify(usuario));
    usuarioActual = usuario;
    
    // Sincronizar con Firebase
    sincronizarUsuarioFirebase(usuario);
    
    setTimeout(function() {
        if (usuario.esAdmin) {
            window.location.href = './admin.html';
        } else {
            window.location.href = './catalogo.html';
        }
    }, 500);
}

// ===== LOGIN DE USUARIO EXISTENTE =====
function loginExistente() {
    const idInput = document.getElementById('loginId');
    
    if (!idInput) {
        alert('❌ Error en el formulario');
        return;
    }
    
    const idJugador = idInput.value.trim();
    
    if (!idJugador) {
        alert('❌ Por favor ingresa tu ID');
        return;
    }
    
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    let usuario = usuarios.find(u => u.idJugador === idJugador);
    
    if (usuario) {
        localStorage.setItem('sesionActual', JSON.stringify(usuario));
        usuarioActual = usuario;
        
        // Sincronizar con Firebase
        sincronizarUsuarioFirebase(usuario);
        
        setTimeout(function() {
            if (usuario.esAdmin) {
                window.location.href = './admin.html';
            } else {
                window.location.href = './catalogo.html';
            }
        }, 500);
    } else {
        // Intentar buscar en Firebase si no está en localStorage
        buscarUsuarioEnFirebase(idJugador);
    }
}

// ===== BUSCAR USUARIO EN FIREBASE =====
async function buscarUsuarioEnFirebase(idJugador) {
    if (!db) {
        alert('❌ ID no registrado');
        return;
    }
    
    try {
        const docRef = db.collection('usuarios').doc(idJugador);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const usuario = docSnap.data();
            
            // Guardar en localStorage
            let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
            usuarios.push(usuario);
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            localStorage.setItem('sesionActual', JSON.stringify(usuario));
            usuarioActual = usuario;
            
            setTimeout(function() {
                if (usuario.esAdmin) {
                    window.location.href = './admin.html';
                } else {
                    window.location.href = './catalogo.html';
                }
            }, 500);
        } else {
            alert('❌ ID no registrado');
        }
    } catch (error) {
        console.error('Error buscando usuario:', error);
        alert('❌ Error al buscar usuario');
    }
}

// ===== CERRAR SESIÓN =====
function cerrarSesion() {
    localStorage.setItem('sesionActual', JSON.stringify(null));
    usuarioActual = null;
    window.location.href = './index.html';
}

// ===== VERIFICAR SESIÓN =====
function verificarSesion() {
    const sesion = localStorage.getItem('sesionActual');
    if (!sesion) return null;
    usuarioActual = JSON.parse(sesion);
    return usuarioActual;
}

// ===== CARGAR CATÁLOGO DE PAQUETES =====
function cargarCatalogo() {
    console.log('📦 Cargando catálogo...');
    
    const catalogo = document.getElementById('catalogoPaquetes');
    if (!catalogo) {
        console.error('❌ No se encontró el elemento catalogoPaquetes');
        return;
    }
    
    catalogo.innerHTML = '';
    
    if (!CONFIG.PAQUETES || CONFIG.PAQUETES.length === 0) {
        catalogo.innerHTML = '<div class="no-paquetes">❌ No hay paquetes disponibles</div>';
        return;
    }
    
    CONFIG.PAQUETES.forEach(paquete => {
        const precioBs = paquete.precioUSD * CONFIG.TASA_DOLAR;
        const card = document.createElement('div');
        card.className = 'paquete-card';
        
        let indicadorMultiplesPines = '';
        if (paquete.diamantes === 200) {
            indicadorMultiplesPines = '<div class="badge-multiples"></div>';
        } else if (paquete.diamantes === 300) {
            indicadorMultiplesPines = '<div class="badge-multiples"></div>';
        }
        
        card.innerHTML = `
            <h3>✨ ${paquete.nombre}</h3>
            <div class="diamantes">💎 ${paquete.diamantes} Diamantes</div>
            <div class="precio">${precioBs.toFixed(2)} Bs</div>
            <div class="precio-usd">≈ $${paquete.precioUSD} USD</div>
            ${indicadorMultiplesPines}
            <button class="btn-comprar" onclick="abrirModalPago(${paquete.diamantes}, ${precioBs}, '${paquete.nombre.replace(/'/g, "\\'")}')">
                🛒 COMPRAR AHORA
            </button>
        `;
        catalogo.appendChild(card);
    });
    
    console.log('✅ Catálogo cargado con', CONFIG.PAQUETES.length, 'paquetes');
}

// ===== ACTUALIZAR TASA EN INTERFAZ =====
function actualizarTasaEnInterfaz() {
    const tasaElement = document.getElementById('tasaDolar');
    const fechaElement = document.getElementById('fechaTasa');
    
    if (tasaElement) {
        tasaElement.textContent = CONFIG.TASA_DOLAR.toFixed(2);
    }
    
    if (fechaElement) {
        const ahora = new Date();
        fechaElement.textContent = `${ahora.toLocaleDateString()} ${ahora.toLocaleTimeString()}`;
    }
}

// ===== ACTUALIZAR TASA (desde admin) =====
function actualizarTasaAdmin() {
    const inputTasa = document.getElementById('tasaManualInput');
    if (inputTasa) {
        const nuevaTasa = parseFloat(inputTasa.value);
        if (nuevaTasa >= 30 && nuevaTasa <= 100) {
            CONFIG.TASA_DOLAR = nuevaTasa;
            guardarTasa();
            actualizarTasaEnInterfaz();
            actualizarPreciosBsEnAdmin();
            
            if (document.getElementById('catalogoPaquetes')) {
                cargarCatalogo();
            }
            
            alert('✅ Tasa actualizada correctamente');
        } else {
            alert('❌ La tasa debe estar entre 100 y 1000');
        }
    }
}

// ===== ACTUALIZAR PRECIO DE PAQUETE =====
function actualizarPrecioPaquete(index, nuevoPrecio) {
    if (index >= 0 && index < CONFIG.PAQUETES.length) {
        CONFIG.PAQUETES[index].precioUSD = parseFloat(nuevoPrecio);
        guardarPrecios();
        
        const precioBs = CONFIG.PAQUETES[index].precioUSD * CONFIG.TASA_DOLAR;
        const precioBsEl = document.getElementById(`precioBs_${CONFIG.PAQUETES[index].diamantes}`);
        if (precioBsEl) {
            precioBsEl.textContent = precioBs.toFixed(2);
        }
        
        if (document.getElementById('catalogoPaquetes')) {
            cargarCatalogo();
        }
    }
}

// ===== ACTUALIZAR DIAMANTES DE PAQUETE =====
function actualizarDiamantesPaquete(index, nuevosDiamantes) {
    if (index >= 0 && index < CONFIG.PAQUETES.length) {
        const valor = parseInt(nuevosDiamantes);
        if (valor > 0 && valor <= 10000) {
            CONFIG.PAQUETES[index].diamantes = valor;
            actualizarNombrePaquete(CONFIG.PAQUETES[index]);
            guardarDiamantes();
            
            const diamantesInput = document.getElementById(`diamantesInput_${index}`);
            if (diamantesInput) diamantesInput.value = valor;
            
            if (document.getElementById('catalogoPaquetes')) cargarCatalogo();
            
            alert('✅ Cantidad de diamantes actualizada');
        } else {
            alert('❌ La cantidad debe estar entre 1 y 10000');
        }
    }
}

// ===== ABRIR MODAL DE PAGO (PASO 1) =====
function abrirModalPago(diamantes, precioBs, nombrePaquete) {
    const sesion = verificarSesion();
    if (!sesion) {
        alert('❌ Debes iniciar sesión primero');
        window.location.href = './index.html';
        return;
    }
    
    paqueteSeleccionado = { diamantes, precioBs, nombre: nombrePaquete };
    
    const modal = document.getElementById('modalPago');
    const infoDiv = document.getElementById('infoPaqueteSeleccionado');
    
    if (!modal || !infoDiv) return;
    
    let infoAdicional = '';
    if (diamantes === 200) {
        infoAdicional = '<p class="info-adicional">🎁 Recibirás 2 pines de 100💎 cada uno</p>';
    } else if (diamantes === 300) {
        infoAdicional = '<p class="info-adicional">🎁 Recibirás 3 pines de 100💎 cada uno</p>';
    }
    
    infoDiv.innerHTML = `
        <h3 class="modal-titulo">${nombrePaquete}</h3>
        <p class="modal-precio">${precioBs.toFixed(2)} Bs</p>
        <p class="modal-diamantes">💎 ${diamantes} Diamantes</p>
        ${infoAdicional}
    `;
    
    // Resetear el select y deshabilitar botón siguiente
    const tipoPago = document.getElementById('tipoPago');
    if (tipoPago) {
        tipoPago.value = '';
    }
    
    const btnSiguiente = document.getElementById('btnSiguiente');
    if (btnSiguiente) {
        btnSiguiente.disabled = true;
        btnSiguiente.style.opacity = '0.5';
        btnSiguiente.style.cursor = 'not-allowed';
    }
    
    // Mostrar placeholder
    const contenido = document.getElementById('contenidoInfoPago');
    if (contenido) {
        contenido.innerHTML = `
            <div class="metodo-pago-placeholder">
                <span>💳</span>
                <p>Seleccione un método de pago</p>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

// ===== MOSTRAR INFORMACIÓN SEGÚN MÉTODO DE PAGO SELECCIONADO =====
function mostrarInfoPagoSegunTipo() {
    console.log('Cambió el método de pago');
    const tipoPago = document.getElementById('tipoPago');
    const btnSiguiente = document.getElementById('btnSiguiente');
    
    if (!tipoPago || !btnSiguiente) {
        console.error('No se encontraron los elementos necesarios');
        return;
    }
    
    // Habilitar o deshabilitar botón según selección
    if (tipoPago.value && tipoPago.value !== '') {
        console.log('Método seleccionado:', tipoPago.value);
        btnSiguiente.disabled = false;
        btnSiguiente.style.opacity = '1';
        btnSiguiente.style.cursor = 'pointer';
    } else {
        btnSiguiente.disabled = true;
        btnSiguiente.style.opacity = '0.5';
        btnSiguiente.style.cursor = 'not-allowed';
    }
    
    // Mostrar información según el método seleccionado
    if (tipoPago.value === 'Transferencia') {
        mostrarInfoTransferencia();
    } else if (tipoPago.value === 'Pago Movil') {
        mostrarInfoPagoMovil();
    } else {
        const contenido = document.getElementById('contenidoInfoPago');
        if (contenido) {
            contenido.innerHTML = `
                <div class="metodo-pago-placeholder">
                    <span>💳</span>
                    <p>Seleccione un método de pago</p>
                </div>
            `;
        }
    }
}

// ===== MOSTRAR INFORMACIÓN DE TRANSFERENCIA =====
function mostrarInfoTransferencia() {
    const datos = DATOS_ADMIN.transferencia;
    const contenido = document.getElementById('contenidoInfoPago');
    if (!contenido) return;
    
    contenido.innerHTML = `
        <p style="color: #9b4b9b; margin-bottom: 8px; font-weight: bold; font-size: 13px; text-align: center;">
            📋 DATOS PARA TRANSFERENCIA
        </p>
        <div style="border-top: 1px solid #333; margin: 8px 0; padding: 8px 0;">
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">🏦 Banco destino:</span> ${datos.banco}
            </p>
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">👤 Titular:</span> ${datos.titular}
            </p>
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">📋 N° Cuenta:</span> 
                <span style="color: #d32f2f; font-weight: bold; font-family: monospace;">${datos.numeroCuenta}</span>
            </p>
            <p style="color: white; font-size: 12px; margin-top: 8px; background: #333; padding: 5px; border-radius: 5px;">
            </p>
        </div>
    `;
}

// ===== MOSTRAR INFORMACIÓN DE PAGO MÓVIL =====
function mostrarInfoPagoMovil() {
    const datos = DATOS_ADMIN.pagoMovil;
    const contenido = document.getElementById('contenidoInfoPago');
    if (!contenido) return;
    
    contenido.innerHTML = `
        <p style="color: #9b4b9b; margin-bottom: 8px; font-weight: bold; font-size: 13px; text-align: center;">
            📱 DATOS PARA PAGO MÓVIL
        </p>
        <div style="border-top: 1px solid #333; margin: 8px 0; padding: 8px 0;">
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">🏦 Banco destino:</span> ${datos.banco}
            </p>
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">👤 Titular:</span> ${datos.titular}
            </p>
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">📞 Teléfono:</span> 
                <span style="color: #d32f2f; font-weight: bold;">${datos.telefono}</span>
            </p>
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">🆔 Cédula:</span> ${datos.cedula}
            </p>
            <p style="color: white; font-size: 13px; margin-bottom: 5px;">
                <span style="color: #9b4b9b;">🔢 Código banco:</span> ${datos.bancoCodigo}
            </p>
            <p style="color: white; font-size: 12px; margin-top: 8px; background: #333; padding: 5px; border-radius: 5px;">
            </p>
        </div>
    `;
}

// ===== IR AL PASO 2 (VERIFICACIÓN) =====
function irPasoVerificacion() {
    const sesion = verificarSesion();
    if (!sesion) {
        alert('❌ Debes iniciar sesión');
        window.location.href = './index.html';
        return;
    }
    
    const tipoPago = document.getElementById('tipoPago');
    
    if (!tipoPago || !tipoPago.value) {
        alert('❌ Por favor selecciona un método de pago');
        return;
    }
    
    // Generar referencia del sistema
    let referenciaSistema = generarReferenciaSistema();
    
    // VERIFICAR SI LA REFERENCIA DEL SISTEMA YA EXISTE
    let pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    let referenciaExiste = referenciaSistemaYaExiste(referenciaSistema);
    
    // Si existe, generar una nueva hasta que sea única
    while (referenciaExiste) {
        referenciaSistema = generarReferenciaSistema();
        referenciaExiste = referenciaSistemaYaExiste(referenciaSistema);
    }
    
    pagoEnProceso = {
        id: generarId(),
        nombreUsuario: sesion.nombreReal,
        apellidoUsuario: sesion.apellidoReal,
        idJugador: sesion.idJugador,
        numeroReferencia: referenciaSistema, // Referencia del sistema (única)
        referenciaReal: null, // Se llenará cuando el usuario verifique
        cantidadBs: paqueteSeleccionado.precioBs,
        cantidadDiamantes: paqueteSeleccionado.diamantes,
        banco: bancoSeleccionado || 'No especificado',
        tipoPago: tipoPago.value,
        fechaPago: new Date().toISOString(),
        verificado: false,
        pinEntregado: null,
        esMultiplesPines: (paqueteSeleccionado.diamantes === 200 || paqueteSeleccionado.diamantes === 300),
        cantidadPinesEntregados: paqueteSeleccionado.diamantes === 200 ? 2 : (paqueteSeleccionado.diamantes === 300 ? 3 : 0)
    };
    
    pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    pagos.push(pagoEnProceso);
    localStorage.setItem('pagos', JSON.stringify(pagos));
    
    // Guardar en Firebase
    guardarPagoEnFirebase(pagoEnProceso);
    
    document.getElementById('referenciaGenerada').textContent = referenciaSistema;
    document.getElementById('referenciaActual').value = referenciaSistema;
    
    cerrarModal('modalPago');
    document.getElementById('modalVerificacion').style.display = 'flex';
}

// ===== GUARDAR PAGO EN FIREBASE (VERSIÓN COMPLETA) =====
async function guardarPagoEnFirebase(pago) {
    try {
        if (!db) return;
        
        // Guardar en colección 'pagos'
        await db.collection('pagos').doc(pago.numeroReferencia).set({
            ...pago,
            fechaPago: firebase.firestore.FieldValue.serverTimestamp(),
            sincronizado: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Pago guardado en Firebase (colección: pagos)');
        
        // También crear una notificación bancaria simulada (para pruebas)
        await db.collection('notificaciones_bancarias').doc(pago.numeroReferencia).set({
            banco: pago.banco || 'Web',
            referencia: pago.numeroReferencia, // Referencia del sistema
            referenciaReal: null, // Se actualizará cuando el usuario verifique
            monto: pago.cantidadBs.toString().replace('.', ','),
            telefono: 'Web',
            fecha: new Date().toLocaleString(),
            texto_completo: `Pago manual desde web - Ref Sistema:${pago.numeroReferencia}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            procesado: false,
            pagoRelacionado: pago.numeroReferencia
        });
        console.log('✅ Notificación simulada creada en Firebase');
        
    } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
    }
}

// ===== ESCUCHAR NOTIFICACIONES BANCARIAS (desde MacroDroid) =====
function escucharNotificacionesBancarias() {
    if (!db) {
        console.error('❌ Firebase no inicializado');
        return;
    }
    
    console.log('👂 Escuchando notificaciones bancarias desde MacroDroid...');
    
    // Escuchar colección de notificaciones bancarias
    db.collection('notificaciones_bancarias')
      .where('procesado', '==', false)
      .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                  const notificacion = change.doc.data();
                  console.log('💰 Notificación bancaria recibida de MacroDroid:', notificacion);
                  
                  // Mostrar en la interfaz si es admin
                  if (usuarioActual && usuarioActual.esAdmin) {
                      mostrarAlertaNotificacion(notificacion, change.doc.id);
                  }
                  
                  // Verificar automáticamente pagos pendientes
                  verificarPagosConNotificacion(notificacion, change.doc.id);
              }
          });
      }, (error) => {
          console.error('❌ Error escuchando notificaciones:', error);
      });
}

// ===== VERIFICAR PAGOS CON NOTIFICACIÓN =====
async function verificarPagosConNotificacion(notificacion, docId) {
    const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    
    // Buscar pagos pendientes que coincidan con la referencia
    const pagosPendientes = pagos.filter(p => 
        !p.verificado && 
        (p.numeroReferencia === notificacion.referencia ||
         p.referenciaReal === notificacion.referencia ||
         p.numeroReferencia.includes(notificacion.referencia) ||
         notificacion.referencia.includes(p.numeroReferencia))
    );
    
    if (pagosPendientes.length > 0) {
        console.log('✅ Coincidencia encontrada!', pagosPendientes.length, 'pagos');
        
        // Marcar como procesado en Firebase
        if (db && docId) {
            await db.collection('notificaciones_bancarias').doc(docId).update({
                procesado: true,
                fechaProcesado: firebase.firestore.FieldValue.serverTimestamp(),
                pagosCoincidentes: pagosPendientes.map(p => p.numeroReferencia)
            });
        }
    }
}

// ===== MOSTRAR ALERTA DE NOTIFICACIÓN (para admin) =====
function mostrarAlertaNotificacion(notificacion, docId) {
    // Verificar si ya existe una alerta para esta referencia
    if (document.getElementById(`alerta-${notificacion.referencia}`)) return;
    
    // Crear elemento flotante
    const alerta = document.createElement('div');
    alerta.id = `alerta-${notificacion.referencia}`;
    alerta.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4a1c4a, #d32f2f);
        color: white;
        padding: 20px;
        border-radius: 15px;
        border: 3px solid #9b4b9b;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 10002;
        max-width: 350px;
        animation: slideInRight 0.3s ease;
        font-family: 'Arial', sans-serif;
    `;
    
    // Determinar icono según banco
    const iconoBanco = notificacion.banco === 'BNC' ? '🏦' : '💰';
    
    alerta.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
            <span style="font-size: 30px;">${iconoBanco}</span>
            <div>
                <h3 style="margin: 0; color: #d32f2f; font-size: 18px;">${notificacion.banco || 'Banco'}</h3>
                <p style="margin: 0; color: #9b4b9b; font-size: 12px;">Nueva notificación de MacroDroid</p>
            </div>
        </div>
        
        <div style="background: #1a1a1a; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #9b4b9b;">Referencia:</span>
                <span style="color: #d32f2f; font-weight: bold; font-size: 18px;">${notificacion.referencia}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #9b4b9b;">Monto:</span>
                <span style="color: #4caf50; font-weight: bold;">${notificacion.monto} Bs</span>
            </div>
            ${notificacion.telefono ? `
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <span style="color: #9b4b9b;">Teléfono:</span>
                <span style="color: white;">${notificacion.telefono}</span>
            </div>
            ` : ''}
            ${notificacion.fecha ? `
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <span style="color: #9b4b9b;">Fecha:</span>
                <span style="color: white;">${notificacion.fecha}</span>
            </div>
            ` : ''}
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button onclick="verificarPagoConNotificacion('${notificacion.referencia}', '${notificacion.monto}', '${docId}')" 
                    style="flex: 2; background: #d32f2f; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                🔍 VERIFICAR AHORA
            </button>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="flex: 1; background: #333; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
                ✕
            </button>
        </div>
    `;
    
    document.body.appendChild(alerta);
    
    // Auto-cerrar después de 15 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 15000);
}

// ===== VERIFICAR PAGO CON NOTIFICACIÓN (desde alerta) =====
async function verificarPagoConNotificacion(referencia, monto, docId) {
    console.log('🔍 Verificando pago con notificación:', {referencia, monto});
    
    // Buscar pago pendiente con esta referencia
    const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    
    // VERIFICAR QUE LA REFERENCIA REAL NO ESTÉ YA USADA EN OTRO PAGO VERIFICADO
    const referenciaRealYaVerificada = pagos.some(p => 
        p.verificado && p.referenciaReal === referencia
    );
    
    if (referenciaRealYaVerificada) {
        console.log('⚠️ Referencia real ya verificada en otro pago:', referencia);
        
        // Marcar notificación como procesada pero con error
        if (db && docId) {
            await db.collection('notificaciones_bancarias').doc(docId).update({
                procesado: true,
                error: 'Referencia real ya verificada',
                fechaProcesado: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        mostrarError('❌ Esta referencia de transferencia ya fue verificada en otro pago');
        return;
    }
    
    const pago = pagos.find(p => 
        !p.verificado && 
        (p.numeroReferencia === referencia || 
         p.referenciaReal === referencia ||
         p.numeroReferencia.includes(referencia) ||
         referencia.includes(p.numeroReferencia))
    );
    
    if (pago) {
        console.log('✅ Pago encontrado:', pago);
        
        // Guardar la referencia real en el pago
        pago.referenciaReal = referencia;
        
        // Verificar el pago automáticamente
        pago.verificado = true;
        
        // Buscar pin para entregar
        let pinesEntregados = [];
        
        if (pago.esMultiplesPines) {
            // Buscar múltiples pines de 100
            let pines = JSON.parse(localStorage.getItem('pines')) || [];
            const pinesDisponibles = pines.filter(p => p.cantidadDiamantes === 100 && !p.usado);
            
            if (pinesDisponibles.length >= pago.cantidadPinesEntregados) {
                const pinesSeleccionados = pinesDisponibles.slice(0, pago.cantidadPinesEntregados);
                
                pinesSeleccionados.forEach(pinSeleccionado => {
                    const pinIndex = pines.findIndex(p => p.id === pinSeleccionado.id);
                    if (pinIndex !== -1) {
                        pines[pinIndex].usado = true;
                        pines[pinIndex].fechaUso = new Date().toISOString();
                        pines[pinIndex].usuarioUsadoId = pago.idJugador;
                        pinesEntregados.push(pines[pinIndex].codigoPin);
                    }
                });
                
                localStorage.setItem('pines', JSON.stringify(pines));
                pago.pinEntregado = pinesEntregados.join(' | ');
                
                // Sincronizar con Firebase
                sincronizarPinesFirebase();
            }
        } else {
            // Buscar pin normal
            let pines = JSON.parse(localStorage.getItem('pines')) || [];
            const pinDisponible = pines.find(p => p.cantidadDiamantes === pago.cantidadDiamantes && !p.usado);
            
            if (pinDisponible) {
                pinDisponible.usado = true;
                pinDisponible.fechaUso = new Date().toISOString();
                pinDisponible.usuarioUsadoId = pago.idJugador;
                pinesEntregados = [pinDisponible.codigoPin];
                pago.pinEntregado = pinDisponible.codigoPin;
                localStorage.setItem('pines', JSON.stringify(pines));
                
                // Sincronizar con Firebase
                sincronizarPinesFirebase();
            }
        }
        
        // Actualizar pago en localStorage
        const pagoIndex = pagos.findIndex(p => p.id === pago.id);
        if (pagoIndex !== -1) {
            pagos[pagoIndex] = pago;
            localStorage.setItem('pagos', JSON.stringify(pagos));
        }
        
        // Actualizar en Firebase
        if (db) {
            await db.collection('pagos').doc(pago.numeroReferencia).update({
                verificado: true,
                referenciaReal: pago.referenciaReal,
                pinEntregado: pago.pinEntregado,
                fechaVerificacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Actualizar también la notificación con la referencia real
            await db.collection('notificaciones_bancarias').doc(docId).update({
                referenciaReal: referencia,
                pagoVerificado: pago.numeroReferencia
            });
        }
        
        // Marcar notificación como procesada
        if (db && docId) {
            await db.collection('notificaciones_bancarias').doc(docId).update({
                procesado: true,
                pagoVerificado: pago.numeroReferencia,
                fechaVerificacion: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Mostrar pines al usuario
        mostrarPinesEnModal(pinesEntregados);
        
        // Cerrar alerta
        const alerta = document.getElementById(`alerta-${referencia}`);
        if (alerta) alerta.remove();
        
        alert(`✅ Pago verificado automáticamente para ${pago.nombreUsuario}`);
        
    } else {
        alert('❌ No se encontró un pago pendiente con esta referencia');
    }
}

// ===== BUSCAR MÚLTIPLES PINES =====
function buscarMultiplesPines(cantidadPinesNecesarios) {
    return new Promise((resolve, reject) => {
        let pines = JSON.parse(localStorage.getItem('pines')) || [];
        const pinesDisponibles = pines.filter(p => p.cantidadDiamantes === 100 && !p.usado);
        
        if (pinesDisponibles.length >= cantidadPinesNecesarios) {
            const pinesSeleccionados = pinesDisponibles.slice(0, cantidadPinesNecesarios);
            resolve(pinesSeleccionados);
        } else {
            reject(`No hay suficientes pines de 100💎. Stock: ${pinesDisponibles.length}`);
        }
    });
}

// ===== VERIFICAR PAGO (versión manual) =====
async function verificarPago() {
    const referenciaCompleta = document.getElementById('referenciaCompleta');
    const referenciaActual = document.getElementById('referenciaActual');
    
    if (!referenciaCompleta || !referenciaCompleta.value) {
        alert('❌ Por favor ingresa la referencia de tu transferencia');
        return;
    }
    
    const referenciaReal = referenciaCompleta.value.trim(); // La que ingresa el usuario (de su transferencia)
    const referenciaSistema = referenciaActual.value; // La generada por el sistema
    
    // VERIFICAR QUE LA REFERENCIA REAL NO ESTÉ YA REGISTRADA EN OTRO PAGO
    let pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    
    // Buscar si esta referencia real ya fue usada en OTRO pago (diferente al actual)
    const referenciaRealYaUsada = pagos.some(p => 
        p.referenciaReal === referenciaReal && 
        p.numeroReferencia !== referenciaSistema
    );
    
    if (referenciaRealYaUsada) {
        mostrarError('❌ Esta referencia de transferencia ya fue registrada en otro pago');
        return;
    }
    
    // Buscar primero en notificaciones de Firebase (MacroDroid)
    if (db) {
        try {
            const snapshot = await db.collection('notificaciones_bancarias')
                .where('referencia', '==', referenciaReal)
                .where('procesado', '==', false)
                .get();
                
            if (!snapshot.empty) {
                const notificacionDoc = snapshot.docs[0];
                const notificacion = notificacionDoc.data();
                console.log('✅ Notificación encontrada en Firebase:', notificacion);
                
                // Verificar automáticamente
                await verificarPagoConNotificacion(notificacion.referencia, notificacion.monto, notificacionDoc.id);
                cerrarModal('modalVerificacion');
                return;
            }
        } catch (error) {
            console.error('Error buscando en Firebase:', error);
        }
    }
    
    // Si no hay en Firebase, buscar en localStorage
    pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    const pago = pagos.find(p => p.numeroReferencia === referenciaSistema && !p.verificado);
    
    if (!pago) {
        mostrarError('❌ Pago no encontrado o ya verificado');
        return;
    }
    
    // Guardar la referencia real en el pago
    pago.referenciaReal = referenciaReal;
    
    const btnVerificar = document.querySelector('#modalVerificacion .btn-siguiente');
    const textoOriginal = btnVerificar.textContent;
    btnVerificar.textContent = '⏳ Verificando...';
    btnVerificar.disabled = true;
    
    setTimeout(async () => {
        btnVerificar.textContent = textoOriginal;
        btnVerificar.disabled = false;
        await procesarEntregaPines(pago);
    }, 2000);
}

// ===== PROCESAR ENTREGA DE PINES =====
async function procesarEntregaPines(pago) {
    const sesion = verificarSesion();
    if (!sesion) return;
    
    let pinesEntregados = [];
    
    if (pago.esMultiplesPines) {
        try {
            const pinesSeleccionados = await buscarMultiplesPines(pago.cantidadPinesEntregados);
            let pines = JSON.parse(localStorage.getItem('pines')) || [];
            
            pinesSeleccionados.forEach(pinSeleccionado => {
                const pinIndex = pines.findIndex(p => p.id === pinSeleccionado.id);
                if (pinIndex !== -1) {
                    pines[pinIndex].usado = true;
                    pines[pinIndex].fechaUso = new Date().toISOString();
                    pines[pinIndex].usuarioUsadoId = sesion.idJugador;
                    pinesEntregados.push(pines[pinIndex].codigoPin);
                }
            });
            
            localStorage.setItem('pines', JSON.stringify(pines));
            
            // Sincronizar con Firebase
            sincronizarPinesFirebase();
            
        } catch (error) {
            mostrarError('❌ ' + error);
            return;
        }
    } else {
        let pines = JSON.parse(localStorage.getItem('pines')) || [];
        const pinDisponible = pines.find(p => p.cantidadDiamantes === pago.cantidadDiamantes && !p.usado);
        
        if (pinDisponible) {
            pinDisponible.usado = true;
            pinDisponible.fechaUso = new Date().toISOString();
            pinDisponible.usuarioUsadoId = sesion.idJugador;
            pinesEntregados = [pinDisponible.codigoPin];
            localStorage.setItem('pines', JSON.stringify(pines));
            
            // Sincronizar con Firebase
            sincronizarPinesFirebase();
        } else {
            mostrarError('❌ No hay pines disponibles para este paquete');
            return;
        }
    }
    
    pago.verificado = true;
    pago.pinEntregado = pinesEntregados.join(' | ');
    
    let pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    const pagoIndex = pagos.findIndex(p => p.id === pago.id);
    if (pagoIndex !== -1) {
        pagos[pagoIndex] = pago;
        localStorage.setItem('pagos', JSON.stringify(pagos));
    }
    
    // Actualizar en Firebase
    if (db) {
        try {
            await db.collection('pagos').doc(pago.numeroReferencia).update({
                verificado: true,
                referenciaReal: pago.referenciaReal,
                pinEntregado: pago.pinEntregado,
                fechaVerificacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Pago actualizado en Firebase');
        } catch (error) {
            console.error('Error actualizando pago en Firebase:', error);
        }
    }
    
    mostrarPinesEnModal(pinesEntregados);
    cerrarModal('modalVerificacion');
}

// ===== MOSTRAR PINES EN MODAL =====
function mostrarPinesEnModal(pines) {
    let html = '';
    
    if (pines.length === 2) {
        html = `
            <div style="margin-bottom: 15px;">
                <div class="pin-copy-container" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center; border: 2px solid #d32f2f; cursor: pointer;" onclick="copiarPin('${pines[0]}')">
                    <div style="font-size: 14px; color: #9b4b9b; margin-bottom: 5px;">🎁 PIN 1 (haz clic para copiar)</div>
                    <div style="font-size: 22px; font-family: monospace; color: #d32f2f; letter-spacing: 2px;">${pines[0]}</div>
                </div>
                <div class="pin-copy-container" style="background: #1a1a1a; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #d32f2f; cursor: pointer;" onclick="copiarPin('${pines[1]}')">
                    <div style="font-size: 14px; color: #9b4b9b; margin-bottom: 5px;">🎁 PIN 2 (haz clic para copiar)</div>
                    <div style="font-size: 22px; font-family: monospace; color: #d32f2f; letter-spacing: 2px;">${pines[1]}</div>
                </div>
            </div>
        `;
    } else if (pines.length === 3) {
        html = `
            <div style="margin-bottom: 15px;">
                <div class="pin-copy-container" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center; border: 2px solid #d32f2f; cursor: pointer;" onclick="copiarPin('${pines[0]}')">
                    <div style="font-size: 14px; color: #9b4b9b; margin-bottom: 5px;">🎁 PIN 1 (haz clic para copiar)</div>
                    <div style="font-size: 22px; font-family: monospace; color: #d32f2f; letter-spacing: 2px;">${pines[0]}</div>
                </div>
                <div class="pin-copy-container" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center; border: 2px solid #d32f2f; cursor: pointer;" onclick="copiarPin('${pines[1]}')">
                    <div style="font-size: 14px; color: #9b4b9b; margin-bottom: 5px;">🎁 PIN 2 (haz clic para copiar)</div>
                    <div style="font-size: 22px; font-family: monospace; color: #d32f2f; letter-spacing: 2px;">${pines[1]}</div>
                </div>
                <div class="pin-copy-container" style="background: #1a1a1a; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #d32f2f; cursor: pointer;" onclick="copiarPin('${pines[2]}')">
                    <div style="font-size: 14px; color: #9b4b9b; margin-bottom: 5px;">🎁 PIN 3 (haz clic para copiar)</div>
                    <div style="font-size: 22px; font-family: monospace; color: #d32f2f; letter-spacing: 2px;">${pines[2]}</div>
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="pin-copy-container" style="background: #1a1a1a; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #d32f2f; cursor: pointer;" onclick="copiarPin('${pines[0]}')">
                <div style="font-size: 14px; color: #9b4b9b; margin-bottom: 10px;">🎁 PIN (haz clic para copiar)</div>
                <div style="font-size: 24px; font-family: monospace; color: #d32f2f; letter-spacing: 4px;">${pines[0]}</div>
            </div>
        `;
    }
    
    html += `
        <p style="color: #4caf50; font-size: 13px; margin-top: 15px; text-align: center;">
            ✅ Haga clic en el PIN para copiarlo
        </p>
    `;
    
    document.getElementById('pinGenerado').innerHTML = html;
    document.getElementById('modalPin').style.display = 'flex';
}

// ===== COPIAR PIN AL PORTAPAPELES =====
function copiarPin(pin) {
    navigator.clipboard.writeText(pin).then(function() {
        const notificacion = document.createElement('div');
        notificacion.style.position = 'fixed';
        notificacion.style.top = '20px';
        notificacion.style.left = '50%';
        notificacion.style.transform = 'translateX(-50%)';
        notificacion.style.background = '#4caf50';
        notificacion.style.color = 'white';
        notificacion.style.padding = '10px 20px';
        notificacion.style.borderRadius = '5px';
        notificacion.style.zIndex = '10002';
        notificacion.style.fontWeight = 'bold';
        notificacion.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        notificacion.textContent = '✅ PIN copiado al portapapeles';
        document.body.appendChild(notificacion);
        
        setTimeout(() => notificacion.remove(), 2000);
    }).catch(() => alert('❌ Error al copiar'));
}

// ===== IR A PÁGINA DE CANJE =====
function irACanje() {
    window.open('https://redeempins.com', '_blank');
    cerrarModal('modalPin');
}

// ===== MOSTRAR ERROR =====
function mostrarError(mensaje) {
    const errorEl = document.getElementById('mensajeError');
    if (errorEl) errorEl.textContent = mensaje;
    document.getElementById('modalError').style.display = 'flex';
}

// ===== CERRAR MODAL =====
function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ===== FUNCIONES DE ADMINISTRACIÓN =====
function ingresarPinesManual(diamantes) {
    const sesion = verificarSesion();
    if (!sesion || !sesion.esAdmin) {
        alert('❌ No tienes permisos de administrador');
        return;
    }
    
    const textarea = document.getElementById('pinesManual_' + diamantes);
    if (!textarea) return;
    
    const textoPines = textarea.value.trim();
    if (!textoPines) {
        alert('❌ Ingresa al menos un pin');
        return;
    }
    
    let lineas = textoPines.split('\n').filter(l => l.trim() !== '');
    if (lineas.length > 700) {
        alert('❌ Máximo 700 pines');
        return;
    }
    
    const pinesValidos = [];
    const paquete = CONFIG.PAQUETES.find(p => p.diamantes === diamantes);
    
    lineas.forEach((linea, index) => {
        const pin = linea.trim();
        const soloDigitos = pin.replace(/-/g, '');
        
        if (soloDigitos.length >= 16 && soloDigitos.length <= 32 && /^\d+$/.test(soloDigitos)) {
            pinesValidos.push({
                id: generarId(),
                codigoPin: pin,
                cantidadDiamantes: diamantes,
                paquete: paquete ? paquete.nombre : `${diamantes} Diamantes`,
                usado: false,
                fechaCreacion: new Date().toISOString(),
                fechaUso: null,
                usuarioUsadoId: null
            });
        }
    });
    
    if (pinesValidos.length === 0) {
        alert('❌ Ningún pin válido');
        return;
    }
    
    if (confirm(`✅ ${pinesValidos.length} pines válidos\n¿Guardar?`)) {
        let pines = JSON.parse(localStorage.getItem('pines')) || [];
        pines = [...pines, ...pinesValidos];
        localStorage.setItem('pines', JSON.stringify(pines));
        textarea.value = '';
        alert(`✅ ${pinesValidos.length} pines guardados`);
        
        // Sincronizar con Firebase
        sincronizarPinesFirebase();
        
        if (typeof cargarTablaPines === 'function') cargarTablaPines();
        if (typeof cargarStockPines === 'function') cargarStockPines();
    }
}

// ===== FUNCIONES PARA TABLAS =====
function cargarTablaUsuarios() {
    const tbody = document.getElementById('tablaUsuarios');
    if (!tbody) return;
    
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    tbody.innerHTML = '';
    
    usuarios.forEach(usuario => {
        const esAdminPrincipal = usuario.idJugador === CONFIG.ADMIN_ID;
        tbody.innerHTML += `<tr>
            <td><input type="checkbox" class="usuario-select" value="${usuario.id}" data-id="${usuario.idJugador}" ${esAdminPrincipal ? 'disabled' : ''}></td>
            <td>${usuario.nombreReal || ''}</td>
            <td>${usuario.apellidoReal || ''}</td>
            <td>${usuario.idJugador || ''}</td>
            <td>${new Date(usuario.fechaRegistro).toLocaleDateString()}</td>
            <td>${usuario.esAdmin ? '👑 ADMIN' : '👤 USER'}</td>
            <td>${esAdminPrincipal ? '🔒' : `<button onclick="eliminarUsuario('${usuario.id}', '${usuario.idJugador}')">🗑️</button>`}</td>
        </tr>`;
    });
}

function cargarTablaPines() {
    const tbody = document.getElementById('tablaPines');
    if (!tbody) return;
    
    const pines = JSON.parse(localStorage.getItem('pines')) || [];
    tbody.innerHTML = '';
    
    pines.slice(0, 20).forEach(pin => {
        tbody.innerHTML += `<tr>
            <td><input type="checkbox" class="pin-select" value="${pin.id}" ${pin.usado ? 'disabled' : ''}></td>
            <td>${pin.codigoPin}</td>
            <td>${pin.paquete}</td>
            <td style="color: ${pin.usado ? '#d32f2f' : '#4caf50'}">${pin.usado ? '❌ USADO' : '✅ DISPONIBLE'}</td>
            <td>${new Date(pin.fechaCreacion).toLocaleString()}</td>
            <td><button onclick="eliminarPin('${pin.id}')" ${pin.usado ? 'disabled' : ''}>🗑️</button></td>
        </tr>`;
    });
    
    actualizarContadoresPines();
}

function cargarTablaPagos() {
    const tbody = document.getElementById('tablaPagos');
    if (!tbody) return;
    
    const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    tbody.innerHTML = '';
    
    pagos.slice(0, 20).forEach(pago => {
        let pinDisplay = pago.pinEntregado || '---';
        if (pago.esMultiplesPines && pago.pinEntregado) {
            pinDisplay = pago.pinEntregado.replace(/\|/g, '<br>');
        }
        
        tbody.innerHTML += `<tr>
            <td>${pago.nombreUsuario}</td>
            <td>${pago.idJugador}</td>
            <td>${pago.numeroReferencia}</td>
            <td>${pago.referenciaReal || '---'}</td>
            <td>${pago.cantidadBs.toFixed(2)} Bs</td>
            <td>${pago.cantidadDiamantes}</td>
            <td>${pago.banco}</td>
            <td>${new Date(pago.fechaPago).toLocaleString()}</td>
            <td>${pago.verificado ? '✅' : '⏳'}</td>
            <td style="font-size: 12px;">${pinDisplay}</td>
        </tr>`;
    });
}

function cargarEstadisticas() {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const pines = JSON.parse(localStorage.getItem('pines')) || [];
    const pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    
    const totalUsuarios = document.getElementById('totalUsuarios');
    const totalPines = document.getElementById('totalPines');
    const totalVentas = document.getElementById('totalVentas');
    const totalDiamantes = document.getElementById('totalDiamantes');
    
    if (totalUsuarios) totalUsuarios.textContent = usuarios.length;
    if (totalPines) totalPines.textContent = pines.length;
    
    const ventas = pagos.filter(p => p.verificado).reduce((s, p) => s + p.cantidadBs, 0);
    if (totalVentas) totalVentas.textContent = ventas.toFixed(2) + ' Bs';
    
    const diamantes = pagos.filter(p => p.verificado).reduce((s, p) => s + p.cantidadDiamantes, 0);
    if (totalDiamantes) totalDiamantes.textContent = diamantes;
    
    // Stock por paquete
    const stockPaquetes = document.getElementById('stockPaquetes');
    if (stockPaquetes) {
        let html = '';
        CONFIG.PAQUETES.forEach(p => {
            const stock = pines.filter(pin => pin.cantidadDiamantes === p.diamantes && !pin.usado).length;
            html += `
                <div style="background: #333; padding: 15px; border-radius: 10px; text-align: center;">
                    <h4 style="color: #9b4b9b; margin-bottom: 5px;">${p.nombre}</h4>
                    <p style="color: #d32f2f; font-size: 24px; font-weight: bold;">${stock}</p>
                    <p style="color: white; font-size: 12px;">pines disponibles</p>
                </div>
            `;
        });
        stockPaquetes.innerHTML = html;
    }
}

function cargarStockPines() {
    CONFIG.PAQUETES.forEach(p => {
        const el = document.getElementById(`stock${p.diamantes}`);
        if (el) {
            const stock = JSON.parse(localStorage.getItem('pines'))?.filter(pin => pin.cantidadDiamantes === p.diamantes && !pin.usado).length || 0;
            el.textContent = stock;
        }
    });
    
    const stock100 = JSON.parse(localStorage.getItem('pines'))?.filter(pin => pin.cantidadDiamantes === 100 && !pin.usado).length || 0;
    const stock100El = document.getElementById('stock100');
    if (stock100El) stock100El.textContent = stock100;
    
    const stock100_1 = document.getElementById('stock100_1');
    if (stock100_1) stock100_1.textContent = stock100;
    
    const stock100_2 = document.getElementById('stock100_2');
    if (stock100_2) stock100_2.textContent = stock100;
}

function actualizarContadoresPines() {
    const pines = JSON.parse(localStorage.getItem('pines')) || [];
    const disponibles = pines.filter(p => !p.usado).length;
    const usados = pines.filter(p => p.usado).length;
    
    const totalEl = document.getElementById('totalPinesCount');
    const disponiblesEl = document.getElementById('disponiblesCount');
    const usadosEl = document.getElementById('usadosCount');
    
    if (totalEl) totalEl.textContent = pines.length;
    if (disponiblesEl) disponiblesEl.textContent = disponibles;
    if (usadosEl) usadosEl.textContent = usados;
}

// ===== FUNCIONES DE ELIMINACIÓN =====
function eliminarPin(pinId) {
    if (!confirm('¿Eliminar este pin?')) return;
    let pines = JSON.parse(localStorage.getItem('pines')) || [];
    pines = pines.filter(p => p.id !== pinId);
    localStorage.setItem('pines', JSON.stringify(pines));
    
    // Sincronizar con Firebase
    sincronizarPinesFirebase();
    
    if (typeof cargarTablaPines === 'function') cargarTablaPines();
    if (typeof cargarStockPines === 'function') cargarStockPines();
}

function eliminarPinesSeleccionados() {
    const checkboxes = document.querySelectorAll('.pin-select:checked');
    if (checkboxes.length === 0) return alert('❌ Selecciona al menos un pin');
    if (!confirm(`¿Eliminar ${checkboxes.length} pines?`)) return;
    
    let pines = JSON.parse(localStorage.getItem('pines')) || [];
    const idsAEliminar = Array.from(checkboxes).map(cb => cb.value);
    pines = pines.filter(p => !idsAEliminar.includes(p.id));
    localStorage.setItem('pines', JSON.stringify(pines));
    
    // Sincronizar con Firebase
    sincronizarPinesFirebase();
    
    if (typeof cargarTablaPines === 'function') cargarTablaPines();
    if (typeof cargarStockPines === 'function') cargarStockPines();
}

function eliminarTodosPinesDisponibles() {
    if (!confirm('⚠️ ¿ELIMINAR TODOS LOS PINES DISPONIBLES?')) return;
    let pines = JSON.parse(localStorage.getItem('pines')) || [];
    const pinesUsados = pines.filter(p => p.usado);
    localStorage.setItem('pines', JSON.stringify(pinesUsados));
    
    // Sincronizar con Firebase
    sincronizarPinesFirebase();
    
    if (typeof cargarTablaPines === 'function') cargarTablaPines();
    if (typeof cargarStockPines === 'function') cargarStockPines();
}

function eliminarUsuario(usuarioId, usuarioIdJugador) {
    if (usuarioIdJugador === CONFIG.ADMIN_ID) {
        alert('❌ No puedes eliminar al administrador');
        return;
    }
    if (!confirm('¿Eliminar este usuario?')) return;
    
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    usuarios = usuarios.filter(u => u.id !== usuarioId);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    if (typeof cargarTablaUsuarios === 'function') cargarTablaUsuarios();
}

function eliminarUsuariosSeleccionados() {
    const checkboxes = document.querySelectorAll('.usuario-select:checked');
    if (checkboxes.length === 0) return alert('❌ Selecciona al menos un usuario');
    
    let intentaEliminarAdmin = false;
    checkboxes.forEach(cb => {
        if (cb.getAttribute('data-id') === CONFIG.ADMIN_ID) intentaEliminarAdmin = true;
    });
    
    if (intentaEliminarAdmin) {
        alert('❌ No puedes eliminar al administrador');
        return;
    }
    
    if (!confirm(`¿Eliminar ${checkboxes.length} usuarios?`)) return;
    
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const idsAEliminar = Array.from(checkboxes).map(cb => cb.value);
    usuarios = usuarios.filter(u => !idsAEliminar.includes(u.id));
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    if (typeof cargarTablaUsuarios === 'function') cargarTablaUsuarios();
}

function eliminarTodosUsuarios() {
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const admin = usuarios.find(u => u.idJugador === CONFIG.ADMIN_ID);
    
    if (!confirm('¿Eliminar todos los usuarios excepto admin?')) return;
    localStorage.setItem('usuarios', JSON.stringify(admin ? [admin] : []));
    if (typeof cargarTablaUsuarios === 'function') cargarTablaUsuarios();
}

// ===== FUNCIONES DE UTILIDAD =====
function cambiarTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    event.target.classList.add('active');
}

function seleccionarTodos() {
    const checkboxes = document.querySelectorAll('.pin-select');
    checkboxes.forEach(cb => cb.checked = event.target.checked);
}

function seleccionarTodosUsuarios() {
    const checkboxes = document.querySelectorAll('.usuario-select:not([disabled])');
    checkboxes.forEach(cb => cb.checked = event.target.checked);
}

function mostrarNotificacionAdmin(msg) {
    alert(msg);
}

// ===== INICIALIZAR =====
cargarPreciosGuardados();
inicializarDB();
inicializarFirebase();

// Agregar estilos CSS para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideInUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .badge-multiples {
        background: #4a1c4a;
        color: #9b4b9b;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 12px;
        margin-top: 5px;
        display: inline-block;
    }
    
    .metodo-pago-placeholder {
        background: #4a1c4a;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        border: 2px dashed #9b4b9b;
        margin: 20px 0;
    }
    
    .metodo-pago-placeholder p {
        color: #9b4b9b;
        font-size: 16px;
        margin: 0;
    }
    
    .metodo-pago-placeholder span {
        font-size: 40px;
        display: block;
        margin-bottom: 10px;
    }
    
    .info-adicional {
        color: #d32f2f;
        font-size: 13px;
        margin-top: 10px;
        font-weight: bold;
    }
    
    .pin-copy-container {
        transition: all 0.3s;
    }
    
    .pin-copy-container:hover {
        background: #2a2a2a !important;
        border-color: #d32f2f !important;
        transform: scale(1.02);
    }
`;
document.head.appendChild(style);

// ===== EXPORTAR FUNCIONES =====
window.registrarUsuario = registrarUsuario;
window.loginExistente = loginExistente;
window.cerrarSesion = cerrarSesion;
window.cargarCatalogo = cargarCatalogo;
window.actualizarTasaEnInterfaz = actualizarTasaEnInterfaz;
window.actualizarTasaAdmin = actualizarTasaAdmin;
window.actualizarPrecioPaquete = actualizarPrecioPaquete;
window.actualizarDiamantesPaquete = actualizarDiamantesPaquete;
window.actualizarPreciosBsEnAdmin = actualizarPreciosBsEnAdmin;
window.abrirModalPago = abrirModalPago;
window.mostrarInfoPagoSegunTipo = mostrarInfoPagoSegunTipo;
window.irPasoVerificacion = irPasoVerificacion;
window.verificarPago = verificarPago;
window.copiarPin = copiarPin;
window.irACanje = irACanje;
window.cerrarModal = cerrarModal;
window.mostrarError = mostrarError;
window.ingresarPinesManual = ingresarPinesManual;
window.eliminarPin = eliminarPin;
window.eliminarPinesSeleccionados = eliminarPinesSeleccionados;
window.eliminarTodosPinesDisponibles = eliminarTodosPinesDisponibles;
window.seleccionarTodos = seleccionarTodos;
window.cargarTablaUsuarios = cargarTablaUsuarios;
window.cargarTablaPagos = cargarTablaPagos;
window.cargarTablaPines = cargarTablaPines;
window.cargarEstadisticas = cargarEstadisticas;
window.cargarStockPines = cargarStockPines;
window.cambiarTab = cambiarTab;
window.eliminarUsuario = eliminarUsuario;
window.eliminarUsuariosSeleccionados = eliminarUsuariosSeleccionados;
window.eliminarTodosUsuarios = eliminarTodosUsuarios;
window.seleccionarTodosUsuarios = seleccionarTodosUsuarios;
window.mostrarNotificacionAdmin = mostrarNotificacionAdmin;
window.actualizarContadoresPines = actualizarContadoresPines;
window.verificarPagoConNotificacion = verificarPagoConNotificacion;

window.db = db;
window.auth = auth;
window.usuarioActual = usuarioActual;