/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    async init(config) {
        this.config = config;
        this.db = new database();

        if (typeof this.config.online == 'boolean') {
            this.config.online ? this.getMicrosoft() : this.getCrack();
        } else if (typeof this.config.online == 'string') {
            if (this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
                this.getAZauth();
            }
        }
        
        // Event listener para el botón "Cancelar"
        document.querySelector('.cancel-home').addEventListener('click', () => {
            document.querySelector('.cancel-home').style.display = 'none';
            changePanel('settings');
        });

        // Event listener para el botón "No-Premium"
        document.querySelector('.connect-button-offline').addEventListener('click', () => {
            this.getCrack(); // Llama a la función getCrack() para la conexión No-Premium
        });
    }


    async getMicrosoft() {
        console.log('Conectando por Microsoft...');
        let popupLogin = new popup();
        let loginHome = document.querySelector('.login-home');
        let microsoftBtn = document.querySelector('.connect-home');
        loginHome.style.display = 'block';

        microsoftBtn.addEventListener("click", () => {
            popupLogin.openPopup({
                title: 'Iniciando sesión',
                content: 'Cargando...',
                color: 'var(--color)'
            });

            ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
                if (account_connect == 'cancel' || !account_connect) {
                    popupLogin.closePopup();
                    return;
                } else {
                    await this.saveData(account_connect)
                    popupLogin.closePopup();
                }

            }).catch(err => {
                popupLogin.openPopup({
                    title: 'Error',
                    content: err,
                    options: true
                });
            });
        })
    }

    async getCrack() {
        console.log('Conectando de forma No-Premium...');
        let popupLogin = new popup(); // Suponiendo que tienes una clase popup para manejar mensajes
        let loginOffline = document.querySelector('.login-offline'); // Contenedor del formulario de inicio de sesión
        let loginHome = document.querySelector('.login-home'); // Contenedor del menú de selección
    
        let emailOffline = document.querySelector('.email-offline'); // Campo de entrada para el nombre de usuario
        let connectOffline = document.querySelector('.connect-offline'); // Botón "Acceder"
        let cancelOffline = document.querySelector('.cancel-offline'); // Botón "Cancelar"
    
        // Oculta el menú de selección
        loginHome.style.display = 'none';
    
        // Mostrar el formulario de inicio de sesión
        loginOffline.style.display = 'block';
    
        // Evento para el botón "Acceder"
        connectOffline.onclick = async () => {
    connectOffline.disabled = true;
    popupLogin.openPopup({
        title: "Iniciando sesión...",
        content: "Espere por favor...",
        color: "var(--color)",
    });

    try {
        let username = emailOffline.value.trim();

        if (username.length < 3) throw new Error("Tu nick debe ser de al menos 3 caracteres.");
        if (username.match(/ /g)) throw new Error("Tu nick no debe contener espacios.");
        if (username.length > 16) username = username.substring(0, 16);

        let MojangConnect = await Mojang.login(username);

        if (MojangConnect.error) {
            popupLogin.openPopup({ title: "Error", content: MojangConnect.message, options: true });
            return;
        }

        await this.saveData(MojangConnect);

    } catch (error) {
        popupLogin.openPopup({ title: "Error", content: error.message || "Ocurrió un error al crear la cuenta.", options: true });
    } finally {
        connectOffline.disabled = false;
        popupLogin.closePopup();
    }
};
    
        // Evento para el botón "Cancelar"
        cancelOffline.onclick = () => {
            loginOffline.style.display = 'none';
            loginHome.style.display = 'block';
            popupLogin.closePopup();
        };
    }
    
    async getAZauth() {
        console.log('Conectando por AZauth...');
        let AZauthClient = new AZauth(this.config.online);
        let PopupLogin = new popup();
        let loginAZauth = document.querySelector('.login-AZauth');
        let loginAZauthA2F = document.querySelector('.login-AZauth-A2F');

        let AZauthEmail = document.querySelector('.email-AZauth');
        let AZauthPassword = document.querySelector('.password-AZauth');
        let AZauthA2F = document.querySelector('.A2F-AZauth');
        let connectAZauthA2F = document.querySelector('.connect-AZauth-A2F');
        let AZauthConnectBTN = document.querySelector('.connect-AZauth');
        let AZauthCancelA2F = document.querySelector('.cancel-AZauth-A2F');

        loginAZauth.style.display = 'block';

        AZauthConnectBTN.addEventListener('click', async () => {
            PopupLogin.openPopup({
                title: 'Iniciando sesión...',
                content: 'Cargando...',
                color: 'var(--color)'
            });

            if (AZauthEmail.value == '' || AZauthPassword.value == '') {
                PopupLogin.openPopup({
                    title: 'Error',
                    content: 'Por favor, rellene todos los campos.',
                    options: true
                });
                return;
            }

            let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);

            if (AZauthConnect.error) {
                PopupLogin.openPopup({
                    title: 'Error',
                    content: AZauthConnect.message,
                    options: true
                });
                return;
            } else if (AZauthConnect.A2F) {
                loginAZauthA2F.style.display = 'block';
                loginAZauth.style.display = 'none';
                PopupLogin.closePopup();

                AZauthCancelA2F.addEventListener('click', () => {
                    loginAZauthA2F.style.display = 'none';
                    loginAZauth.style.display = 'block';
                });

                connectAZauthA2F.addEventListener('click', async () => {
                    PopupLogin.openPopup({
                        title: 'Iniciando sesión...',
                        content: 'Cargando...',
                        color: 'var(--color)'
                    });

                    if (AZauthA2F.value == '') {
                        PopupLogin.openPopup({
                            title: 'Error',
                            content: 'Por favor ingrese el código A2F.',
                            options: true
                        });
                        return;
                    }

                    AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value, AZauthA2F.value);

                    if (AZauthConnect.error) {
                        PopupLogin.openPopup({
                            title: 'Error',
                            content: AZauthConnect.message,
                            options: true
                        });
                        return;
                    }

                    await this.saveData(AZauthConnect)
                    PopupLogin.closePopup();
                });
            } else if (!AZauthConnect.A2F) {
                await this.saveData(AZauthConnect)
                PopupLogin.closePopup();
            }
        });
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let account = await this.db.createData('accounts', connectionData)
        let instanceSelect = configClient.instance_selct
        let instancesList = await config.getInstanceList()
        configClient.account_selected = account.ID;

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == account.name)
                if (whitelist !== account.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        configClient.instance_selct = newInstanceSelect.name
                        await setStatus(newInstanceSelect.status)
                    }
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        changePanel('home');
    }
}
export default Login;