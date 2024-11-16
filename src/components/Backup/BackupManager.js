//@ts-check
import { useMainSettings, Settings, SettingsManager } from "../Settings/Settings";
import ipc from "../../ipc";

class BackupManager extends SettingsManager {
    /**
     * @param {Settings} settings 
     */
    constructor(settings) {
        super(settings, 'backup');
    }

    async fake_save(){
        const res = await ipc.backup_list("C:\\Users\\bondg\\Desktop\\Dev\\warsztat-gold\\mdb\\test_backup", ['var1', 'var2', 'var3']);
        console.log(res);
        return true;
    }

    /**@param {typeof Settings.prototype.categories.backup} new_options*/
    async update_impl(new_options) {
        return await this.fake_save();
    }
    
}




const mainSettings = useMainSettings();
const mainBackupManager = new BackupManager(mainSettings);

function useMainBackupManager() {
    return mainBackupManager;
}

export {
    useMainBackupManager,
    BackupManager,
}