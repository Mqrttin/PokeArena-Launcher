/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')

class Home {
    static id = "home";
    async init(config) {
    this.config = config;
    this.db = new database();

    let configClient = await this.db.readData('configClient');

    if (!configClient || Object.keys(configClient).length === 0) {
        console.log("Creando configClient por primera vez");

        await this.db.createData('configClient', {
            account_selected: null,
            instance_selct: null,
            launcher_config: {
                closeLauncher: "close-launcher",
                download_multi: true,
                intelEnabledMac: false
            },
            java_config: {
                java_path: null,
                java_memory: {
                    min: 2,
                    max: 4
                }
            },
            game_config: {
                screen_size: {
                    width: 854,
                    height: 480
                }
            }
        });
    }

        // --- FUNCIONES DE LOGOS Y REDES ---
        this.initSocials();
        this.initPartnerLogos();
        // --- FIN FUNCIONES ---

        this.instancesSelect()
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))

            // --- CLICK EN PLAYER HEAD → ABRIR AJUSTES EN CUENTAS ---
    document.querySelector(".player-head").addEventListener("click", () => {

        // 1) Abrir menú de ajustes
        document.querySelector(".settings-btn").click();

        // 2) Esperar a que el panel settings cargue y abrir "Cuentas"
        setTimeout(() => {
            let btn = document.getElementById("account");
            if (btn) btn.click();
        }, 150);
    });
    }

    // --- SOCIAL-BLOCKS ---
    initSocials() {
        let socials = document.querySelectorAll('.social-block')
        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(social.dataset.url)
            })
        });
    }
    

    // --- LOGOS DE PARTNERS ---
    initPartnerLogos() {
        const logos = [
            { id: 'logo-top-left', url: 'https://tienda.pokearena.net/' },
            { id: 'logo-top-right', url: 'https://discord.com/invite/pokearena' }
        ];

        logos.forEach(logo => {
            let elem = document.getElementById(logo.id);
            if (elem) {
                elem.addEventListener('click', () => {
                    shell.openExternal(logo.url);
                });
            }
        });
    }

async instancesSelect() {
    let configClient = await this.db.readData('configClient')
    let auth = await this.db.readData('accounts', configClient.account_selected)
    let instancesList = await config.getInstanceList()
    let instanceSelect = configClient.instance_selct

    let instanceBTN = document.querySelector('.play-instance')
    let instancePopup = document.querySelector('.instance-popup')
    let instanceCloseBTN = document.querySelector('.close-popup')

    // Mostrar instancia actual en el botón
    // Mostrar instancia actual en el botón y actualizar info del servidor
if (instanceSelect) {
    // Nombre bonito para mostrar en el botón
    let uiName = "";
    if (instanceSelect.startsWith("Cobblemon")) {
        uiName = instanceSelect.includes("Low") ? "Cobblemon Low Profile" : "Cobblemon High Profile";
    } else if (instanceSelect.startsWith("Pixelmon")) {
        uiName = instanceSelect.includes("Low") ? "Pixelmon Low Profile" : "Pixelmon High Profile";
    } else {
        uiName = instanceSelect; // fallback por si hay algo raro
    }

    // Mostrar en el launcher
    document.querySelector('.instance-select').innerHTML = uiName;

    // Actualizar información del servidor automáticamente
    let instanceInfo = instancesList.find(i => i.name === instanceSelect);
    if (instanceInfo) {
        setStatus(instanceInfo.status); // Esto actualizará nombre del servidor y jugadores
    }
}


    // Mostrar popup al presionar el botón
instanceBTN.addEventListener('click', e => {
    if (e.target.classList.contains('instance-select')) {
        instancePopup.style.display = 'flex';

        // Animar el panel completo
        const tab = document.querySelector('.instances-tab');
        tab.classList.remove('show'); // reset
        setTimeout(() => tab.classList.add('show'), 10); // pequeño delay para forzar transición

        // Animación en cascada de las instance-box
        const boxes = document.querySelectorAll('.instance-box');
        boxes.forEach((box, index) => {
            box.classList.remove('show'); // reset
            setTimeout(() => box.classList.add('show'), index * 100);
        });

    } else {
        this.startGame();
    }
});

instanceCloseBTN.addEventListener('click', () => {
    const tab = document.querySelector('.instances-tab');
    const boxes = document.querySelectorAll('.instance-box');

    // Quitar clase show para iniciar animación de salida
    tab.classList.remove('show');
    boxes.forEach(box => box.classList.remove('show'));

    // Esperar a que termine la transición antes de ocultar el popup
    setTimeout(() => {
        document.querySelector('.instance-popup').style.display = 'none';
    }, 400); // coincide con la duración de la transición
});


    // Botones Low/High
    document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', async e => {

        const box = e.target.closest('.instance-box')
        const type = box.dataset.type   // cobblemon / pixelmon
        const profile = e.target.dataset.profile  // low / high

        // Nombre REAL del webhost
        let instanceName = "";
        if (type === "cobblemon") {
            instanceName = (profile === "low") ? "Cobblemon Low Profile" : "Cobblemon High Profile";
        } else if (type === "pixelmon") {
            instanceName = (profile === "low") ? "Pixelmon Low Profile" : "Pixelmon High Profile";
        }

        // Nombre bonito para mostrarlo en el botón
        const uiName =
            (type === "cobblemon" ? "Cobblemon" : "Pixelmon") +
            (profile === "low" ? " Low Profile" : " High Profile");

        // Guardar en config
        configClient.instance_selct = instanceName;
        await this.db.updateData('configClient', configClient);

        // Mostrar en el launcher
        document.querySelector('.instance-select').innerHTML = uiName;

        // Cerrar popup
        instancePopup.style.display = 'none';

        // Actualizar información del servidor arriba
        let list = await config.getInstanceList();
        let instance = list.find(i => i.name === instanceName);
        if (instance) setStatus(instance.status);
    })
});

}

    async startGame() {

        const fs = require('fs');
        const path = require('path');

        let launch = new Launch()

let configClient = await this.db.readData('configClient')
console.log("CONFIG CLIENT =>", configClient)

let instance = await config.getInstanceList()

console.log("ACCOUNT_SELECTED =>", configClient.account_selected)

let authenticator = await this.db.readData('accounts', configClient.account_selected)
console.log("AUTH OBJECT =>", authenticator)

// ===============================
// 🔐 COMPATIBILIDAD CUENTAS (HOME ANTIGUO)
// ===============================

// 1️⃣ No hay cuenta seleccionada
if (!configClient.account_selected) {
    let pop = new popup()
    pop.openPopup({
        title: 'Cuenta no seleccionada',
        content: 'Debes iniciar sesión con una cuenta premium para jugar.',
        color: 'red',
        options: true
    })
    changePanel('login')
    return
}

// 2️⃣ Cuenta no existe en DB
if (!authenticator) {
    let pop = new popup()
    pop.openPopup({
        title: 'Cuenta inválida',
        content: 'La cuenta seleccionada no existe. Inicia sesión nuevamente.',
        color: 'red',
        options: true
    })
    changePanel('login')
    return
}

// 3️⃣ Sesión premium incompleta (CAUSA DEL ERROR)
if (
    !authenticator.access_token ||
    !authenticator.client_token ||
    !authenticator.uuid ||
    !authenticator.name
) {
    let pop = new popup()
    pop.openPopup({
        title: 'Sesión expirada',
        content: 'Tu sesión premium expiró. Inicia sesión nuevamente.',
        color: 'red',
        options: true
    })
    changePanel('login')
    return
}

// 4️⃣ Bloquear offline accidental
if (authenticator.offline === true) {
    let pop = new popup()
    pop.openPopup({
        title: 'Cuenta no premium',
        content: 'Esta instancia requiere una cuenta premium.',
        color: 'red',
        options: true
    })
    return
}

// ===============================
// ✅ FIN COMPATIBILIDAD ANTIGUA
// ===============================


let options = instance.find(i => i.name == configClient.instance_selct)


        let playInstanceBTN = document.querySelector('.play-instance')
        let infoStartingBOX = document.querySelector('.info-starting-game')
        let infoStarting = document.querySelector(".info-starting-game-text")
        let progressBar = document.querySelector('.progress-bar')

        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 30000,
            path: `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
            instance: options.name,
            version: options.loadder.minecraft_version,
            detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,

            loader: {
                type: options.loadder.loadder_type,
                build: options.loadder.loadder_version,
                enable: options.loadder.loadder_type == 'none' ? false : true
            },

            verify: options.verify,
            ignored: [...options.ignored],
            java: {
                path: configClient.java_config.java_path
            },

            screen: {
                width: configClient.game_config.screen_size.width,
                height: configClient.game_config.screen_size.height
            },

            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        }
        

        ipcRenderer.send('minecraft-launch');

        // --- 🔧 LIMPIEZA AUTOMÁTICA MULTIVERSIÓN ---
        try {
            const baseDir = path.join(process.env.APPDATA, '.SUH');

            // 1️⃣ Borrar librerías viejas ASM 9.6
            const asmDir = path.join(baseDir, 'libraries', 'org', 'ow2', 'asm', '9.6');
            const asmJar = path.join(baseDir, 'libraries', 'org', 'ow2', 'asm', 'asm-9.6.jar');
            if (fs.existsSync(asmDir)) {
                fs.rmSync(asmDir, { recursive: true, force: true });
                console.log('[Launcher]: Eliminada carpeta vieja ASM 9.6');
            }
            if (fs.existsSync(asmJar)) {
                fs.rmSync(asmJar, { force: true });
                console.log('[Launcher]: Eliminado archivo asm-9.6.jar');
            }

            // 2️⃣ Revisar todas las versiones y limpiar referencias
            const versionsDir = path.join(baseDir, 'versions');
            if (fs.existsSync(versionsDir)) {
                const versions = fs.readdirSync(versionsDir).filter(v => {
                    const jsonFile = path.join(versionsDir, v, `${v}.json`);
                    return fs.existsSync(jsonFile);
                });

                for (const version of versions) {
                    const versionPath = path.join(versionsDir, version, `${version}.json`);
                    try {
                        let json = fs.readFileSync(versionPath, 'utf8');
                        if (json.includes('org.ow2.asm:asm:9.6')) {
                            json = json.replace(/,\s*{\s*"downloads"[\s\S]+?"org\.ow2\.asm:asm:9\.6"[\s\S]+?}/, '');
                            fs.writeFileSync(versionPath, json);
                            console.log(`[Launcher]: Eliminada referencia a ASM 9.6 en ${version}.json`);
                        }
                    } catch (err) {
                        console.warn(`[Launcher]: No se pudo editar ${version}.json:`, err);
                    }
                }
            }
        } catch (err) {
            console.warn('[Launcher]: Error al limpiar ASM 9.6 automáticamente:', err);
        }
        // --- FIN LIMPIEZA ---

        launch.Launch(opt);

        console.log("AUTH OBJECT =>", authenticator);
        playInstanceBTN.style.display = "none";
        infoStartingBOX.style.display = "block";
        progressBar.style.display = "";
        progressBar.value = 0;
        progressBar.max = 100;

        // Pasos de preparación simulados (si no hay descarga)
        const steps = [
            { text: 'Verificando archivos...', value: 25 },
            { text: 'Preparando librerías...', value: 50 },
            { text: 'Configurando instancia...', value: 75 },
            { text: 'Ejecutando!', value: 100 }
        ];

        let currentStep = 0;
        const prepInterval = setInterval(() => {
            progressBar.value = steps[currentStep].value;
            infoStarting.innerHTML = steps[currentStep].text;
            currentStep++;

            if (currentStep >= steps.length) {
                clearInterval(prepInterval);
            // Aquí se queda la barra visible si hay descargas reales
            }
        }, 700);


        launch.on('progress', (percent) => {
            clearInterval(prepInterval);
            const clean = Math.min(Math.max(percent, 0), 100);
            infoStarting.innerHTML = `Descargando ${clean.toFixed(0)}%`;
            progressBar.value = clean;
            progressBar.max = 100;
        });

        launch.on('extract', file => {
            infoStarting.innerHTML = `Verificando ${file}`
        });

        launch.on('estimated', (time) => {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = Math.floor(time - hours * 3600 - minutes * 60);
            console.log(`${hours}h ${minutes}m ${seconds}s`);
        })

        launch.on('speed', (speed) => {
            console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
        })

        launch.on('patch', patch => {
            console.log(patch);
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Configurando el juego...`
        });

        launch.on('data', (e) => {
            progressBar.style.display = "none"
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-hide")
            };
            new logger('Minecraft', '#36b030');
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Ejecutando...`
            console.log(e);
        })

        launch.on('close', code => {

            // 🔥 Cerrar completamente el launcher al cerrar Minecraft
            ipcRenderer.send('force-exit');
            return;

        });

        launch.on('error', err => {
            let popupError = new popup()
            popupError.openPopup({
                title: 'Error',
                content: err.error,
                color: 'red',
                options: true
            })
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            infoStarting.innerHTML = `Verificación`
            new logger(pkg.name, '#7289da');
            console.log(err);
        });
    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}

export default Home;
