//@ts-check
import { useMainSettings, Settings, SettingsManager } from "../Settings/Settings";
import ipc from "../../ipc";
import useMainMsgManager, { MsgManager } from "../Msg/MsgManager";

/**
 * @typedef {typeof Settings.prototype.categories.backup} BackupSettings
 * @extends SettingsManager<'backup'>
 */
class BackupManager extends SettingsManager {
    /**
     * @param {Settings} settings 
     * @param {MsgManager} msgManager
     */
    constructor(settings, msgManager) {
        super(settings, 'backup');
        this.msgManager = msgManager;
    }

    async fake_save(path){
        console.log("Path: ", path);
        const res = await ipc.backup_list(path, ['var1', 'var2', 'var3']);
        console.log(res);
        return true;
    }

    /**
     * 
     * @param {string[]} paths 
     * @param {string[]} variants 
     * @param {string}   prefix 
     * @param {string}   ext 
     */
    async list_impl(paths, variants, prefix, ext) {
        return Promise.all(
            paths.map(
                path => ipc
                        .backup_list(path, variants, prefix, ext)
                        .then(lists => {return {path, lists}})
            )
        );
    }

    

    /**@param {BackupSettings} new_settings*/
    async update_impl(new_settings) {
        if(new_settings.list.some(x => x.std_en)) {
            throw new Error('TEST - backup std_en is set to TRUE');
        }
        return await this.fake_save(new_settings.list[0].path);
    }


    /**@param {BackupSettings} new_settings*/
    async update(new_settings) {
        return this.update_impl(new_settings).catch(err => {
            if(this.msgManager) {
                this.msgManager.postError(err);
            } else {
                throw err;
            }
        });
    }
}





/**@type {MsgManager?} */
let mainMsgManager = null;
/**@type {Settings?} */
let mainSettings = null;
/**@type {BackupManager?} */
let mainBackupManager = null;

function useMainBackupManager() {
    if(!mainBackupManager) {
        mainMsgManager = useMainMsgManager();
        mainSettings = useMainSettings();
        mainBackupManager = new BackupManager(mainSettings, mainMsgManager);
    }
    return mainBackupManager;
}

export {
    useMainBackupManager,
    BackupManager,
}