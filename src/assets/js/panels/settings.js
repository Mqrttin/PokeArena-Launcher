/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

import { changePanel, accountSelect, database, Slider, config, setStatus, popup, appdata, setBackground } from '../utils.js'
const { ipcRenderer, shell } = require('electron');
const os = require('os');

class Settings {
    static id = "settings";

    async init(config) {
        this.config = config;
        this.db = new database();

        // ✅ SOLO afecta al panel de settings
        requestAnimationFrame(() => {
        const settingsContainer = document.querySelector('.settings .container');
        });

        this.navBTN();
        this.accounts();
        this.ram();
        this.resolution();
        this.launcher();
    }

    navBTN() {
        document.querySelector('.nav-box').addEventListener('click', e => {
            if (e.target.classList.contains('nav-settings-btn')) {
                let id = e.target.id;
                let activeSettingsBTN = document.querySelector('.active-settings-BTN');
                let activeContainerSettings = document.querySelector('.active-container-settings');

                // Guardar
                if (id == 'save') {
                    activeSettingsBTN?.classList.toggle('active-settings-BTN');
                    document.querySelector('#account').classList.add('active-settings-BTN');

                    activeContainerSettings?.classList.toggle('active-container-settings');
                    document.querySelector(`#account-tab`).classList.add('active-container-settings');
                    return changePanel('home');
                }

                // Créditos
                if (id == 'credits') {
                    activeSettingsBTN?.classList.toggle('active-settings-BTN');
                    e.target.classList.add('active-settings-BTN');

                    activeContainerSettings?.classList.toggle('active-container-settings');
                    document.querySelector(`#${id}-tab`).classList.add('active-container-settings');
                    return;
                }

                // Otros botones
                activeSettingsBTN?.classList.toggle('active-settings-BTN');
                e.target.classList.add('active-settings-BTN');

                activeContainerSettings?.classList.toggle('active-container-settings');
                document.querySelector(`#${id}-tab`).classList.add('active-container-settings');
            }
        });
    }

    accounts() {
        document.querySelector('.accounts-list').addEventListener('click', async e => {
            let popupAccount = new popup();
            try {
                let id = e.target.id;
                if (e.target.classList.contains('account')) {
                    popupAccount.openPopup({
                        title: 'Iniciando',
                        content: 'Cargando...',
                        color: 'var(--color)'
                    });

                    if (id == 'add') {
                        document.querySelector('.cancel-home').style.display = 'inline';
                        return changePanel('login');
                    }

                    let account = await this.db.readData('accounts', id);
                    let configClient = await this.setInstance(account);
                    await accountSelect(account);
                    configClient.account_selected = account.ID;
                    return await this.db.updateData('configClient', configClient);
                }

                if (e.target.classList.contains("delete-profile")) {
                    popupAccount.openPopup({
                        title: 'Confirmar',
                        content: 'Cargando...',
                        color: 'var(--color)'
                    });
                    await this.db.deleteData('accounts', id);
                    let deleteProfile = document.getElementById(`${id}`);
                    let accountListElement = document.querySelector('.accounts-list');
                    accountListElement.removeChild(deleteProfile);

                    if (accountListElement.children.length == 1) return changePanel('login');

                    let configClient = await this.db.readData('configClient');

                    if (configClient.account_selected == id) {
                        let allAccounts = await this.db.readAllData('accounts');
                        configClient.account_selected = allAccounts[0].ID;
                        accountSelect(allAccounts[0]);
                        let newInstanceSelect = await this.setInstance(allAccounts[0]);
                        configClient.instance_selct = newInstanceSelect.instance_selct;
                        return await this.db.updateData('configClient', configClient);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                popupAccount.closePopup();
            }
        });
    }

    async setInstance(auth) {
        let configClient = await this.db.readData('configClient');
        let instanceSelect = configClient.instance_selct;
        let instancesList = await config.getInstanceList();

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth.name);
                if (whitelist !== auth.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false);
                        configClient.instance_selct = newInstanceSelect.name;
                        await setStatus(newInstanceSelect.status);
                    }
                }
            }
        }
        return configClient;
    }

async ram() {
    let config = await this.db.readData('configClient');
    let totalMem = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;

    // Seleccionamos el bloque donde mostramos la info de RAM
    let ramInfoBlock = document.querySelector(".ram-info-block");

    // Obtenemos los valores actuales de RAM configurados
    let ram = config?.java_config?.java_memory ? {
        ramMin: config.java_config.java_memory.min,
        ramMax: config.java_config.java_memory.max
    } : { ramMin: 1, ramMax: 2 };

    // Si la RAM total es menor a la mínima configurada, ajustamos
    if (totalMem < ram.ramMin) {
        config.java_config.java_memory = { min: 1, max: 2 };
        await this.db.updateData('configClient', config);
        ram = { ramMin: 1, ramMax: 2 };
    }

    // Inicializamos el slider
    let sliderDiv = document.querySelector(".memory-slider");
    if (sliderDiv) sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100));

    let slider = new Slider(".memory-slider", parseFloat(ram.ramMin), parseFloat(ram.ramMax));

    // Mostramos la info inicial de RAM
    if (ramInfoBlock) {
        ramInfoBlock.innerHTML = `
            <b>Tienes <span style="color:#ff8c00">${totalMem}</span> GB de RAM total.</b><br>
            Estás usando desde <span style="color:#ff8c00">${ram.ramMin}</span> GB hasta <span style="color:#ff8c00">${ram.ramMax}</span> GB.
        `;
    }

    // Actualizamos la info cada vez que el slider cambie
    slider.on("change", async (min, max) => {
    let config = await this.db.readData('configClient');

    if (ramInfoBlock) {
        ramInfoBlock.innerHTML = `
            <b>Tienes <span style="color:#ff8c00">${totalMem}</span> GB de RAM total.</b><br>
            Estás usando desde <span style="color:#ff8c00">${min}</span> GB hasta <span style="color:#ff8c00">${max}</span> GB.
        `;
    }

    config.java_config.java_memory = { min: min, max: max };
    await this.db.updateData('configClient', config);
});
}

    async resolution() {
        let configClient = await this.db.readData('configClient');
        let resolution = configClient?.game_config?.screen_size || { width: 1920, height: 1080 };

        let width = document.querySelector(".width-size");
        let height = document.querySelector(".height-size");
        let resolutionReset = document.querySelector(".size-reset");

        width.value = resolution.width;
        height.value = resolution.height;

        width.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient');
            configClient.game_config.screen_size.width = width.value;
            await this.db.updateData('configClient', configClient);
        });

        height.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient');
            configClient.game_config.screen_size.height = height.value;
            await this.db.updateData('configClient', configClient);
        });

        resolutionReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient');
            configClient.game_config.screen_size = { width: '854', height: '480' };
            width.value = '854';
            height.value = '480';
            await this.db.updateData('configClient', configClient);
        });

        // --- NUEVO BOTÓN DE ABRIR CARPETA ---
        const openModsBtn = document.querySelector(".open-mods-btn"); // Asegúrate de que esté en HTML
        if (openModsBtn) {
            openModsBtn.addEventListener("click", async () => {
                let pathMods = `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/instances`;
                shell.openPath(pathMods);
            });
        }
    }

    async launcher() {
        let configClient = await this.db.readData('configClient');

        let maxDownloadFiles = configClient?.launcher_config?.download_multi || 100;
        let maxDownloadFilesInput = document.querySelector(".max-files");
        let maxDownloadFilesReset = document.querySelector(".max-files-reset");

        if (maxDownloadFilesInput) maxDownloadFilesInput.value = maxDownloadFiles;
        if (maxDownloadFilesReset) {
            maxDownloadFilesReset.addEventListener("click", async () => {
                let configClient = await this.db.readData('configClient');
                if (maxDownloadFilesInput) maxDownloadFilesInput.value = 100;
                configClient.launcher_config.download_multi = 100;
                await this.db.updateData('configClient', configClient);
            });
        }

        maxDownloadFilesInput.value = maxDownloadFiles;

        maxDownloadFilesInput.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient');
            configClient.launcher_config.download_multi = maxDownloadFilesInput.value;
            await this.db.updateData('configClient', configClient);
        });

        maxDownloadFilesReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient');
            maxDownloadFilesInput.value = 100;
            configClient.launcher_config.download_multi = 100;
            await this.db.updateData('configClient', configClient);
        });

        /*
// --- TEMPORAL: código de tema comentado porque ya no hay HTML ---
let themeBox = document.querySelector(".theme-box");
let theme = configClient?.launcher_config?.theme || "auto";

if (theme == "auto") document.querySelector('.theme-btn-auto').classList.add('active-theme');
else if (theme == "dark") document.querySelector('.theme-btn-sombre').classList.add('active-theme');
else if (theme == "light") document.querySelector('.theme-btn-clair').classList.add('active-theme');

themeBox.addEventListener("click", async e => {
    if (!e.target.classList.contains('theme-btn')) return;

    let activeTheme = document.querySelector('.active-theme');
    if (e.target.classList.contains('active-theme')) return;
    activeTheme?.classList.remove('active-theme');

    if (e.target.classList.contains('theme-btn-auto')) {
        setBackground();
        theme = "auto";
        e.target.classList.add('active-theme');
    } else if (e.target.classList.contains('theme-btn-sombre')) {
        setBackground(true);
        theme = "dark";
        e.target.classList.add('active-theme');
    } else if (e.target.classList.contains('theme-btn-clair')) {
        setBackground(false);
        theme = "light";
        e.target.classList.add('active-theme');
    }

    let configClient = await this.db.readData('configClient');
    configClient.launcher_config.theme = theme;
    await this.db.updateData('configClient', configClient);
});
*/
    }
}

export default Settings;
