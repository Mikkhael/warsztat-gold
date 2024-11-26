//@ts-check
import { useMainSettings, Settings, SettingsManager } from "../Settings/Settings";
import ipc from "../../ipc";
import useMainMsgManager, { MsgManager } from "../Msg/MsgManager";
import { date, deep_copy, pad } from "../../utils";

/**
 * @typedef {typeof Settings.prototype.categories.backup} BackupSettings
 */

const VARIANT_NAME_TO_DISPLAY = {
    mon: 'comiesieczny',
    wee: 'cotygodniowy',
    day: 'codzienny',
    std: 'ostatni'
}
const VARIANT_NAMES    = Object.keys  (VARIANT_NAME_TO_DISPLAY);
const VARIANT_DISPLAYS = Object.values(VARIANT_NAME_TO_DISPLAY);

/**
 * @extends SettingsManager<'backup'>
 */
class BackupManager extends SettingsManager {
    /**
     * @param {Settings} settings 
     * @param {MsgManager} msgManager
     */
    constructor(settings, msgManager, prefix = 'kopia_warsztat', ext = '.db3') {
        super(settings, 'backup');
        this.msgManager = msgManager;
        this.prefix = prefix;
        this.ext = ext;
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

    
    
    /**
     * @param {boolean} loaded 
     */
    async on_changed(loaded) {
        if(loaded) {
            return this.perform_backup();
        }
        return true;
    }

    /**
     * @param {string} [mock_date] 
     */
    async perform_backup(nodelete = false, mock = false, mock_date) {
        const self_settings = this.get_settings();
        try {
            const res = await BackupManager.do_backup_routine(
                self_settings.list,
                this.prefix,
                this.ext,
                nodelete,
                mock,
                mock_date
            );
            if(res.copies_to_create.length > 0 || res.filepaths_to_delete.length > 0) {
                this.msgManager.post('info', 'Wykonano kopię zapasową. Stworzono ' 
                    + res.copies_to_create.length + ' nowych kopii. Usunięto '
                    + res.filepaths_to_delete.length + ' przedawnionych kopii.',
                10000);
            }
            return res;
        } catch (err) {
            this.msgManager.postError(err);
            return false;
        }
    }


    /**
     * @param {string} [mock_date]
     * @param {BackupSettings['list']?} rules_list 
     */
    async trigger_test(mock_date, nomock = false, allow_delete = false, prefix = 'kopia_warsztat', ext = ".db3", rules_list = null) {
        if(!rules_list) {
            rules_list = this.get_settings().list;
        }
        const res = await BackupManager.do_backup_routine(rules_list, prefix, ext, !allow_delete, !nomock, mock_date);
    }


    /**
     * 
     * @param {BackupSettings['list']} rules_list 
     * @param {string}  prefix 
     * @param {string}  ext 
     * @param {boolean} nodelete 
     * @param {string}  [mock_date]
     */
    static async do_backup_routine(rules_list, prefix, ext, nodelete, mock = false, mock_date) {
        const processed = await Promise.all( rules_list.map(async rules => {
            const lists = await ipc.backup_list(rules.path, VARIANT_DISPLAYS, prefix, ext);
            console.log('TEST LIST', rules.path, lists);
            const processed = this.process_backup_lists(lists, rules, mock_date);
            return processed;
        }));

        const processed_flat = {
            copies_to_create:    processed.map(x => x.copies_to_create).flat(),
            filepaths_to_delete: processed.map(x => x.filepaths_to_delete).flat(),
        }

        console.log('BACKUP RESULT', processed_flat);
        if(!mock) {
            await ipc.backup(
                processed_flat.filepaths_to_delete,
                processed_flat.copies_to_create,
                prefix,
                ext,
                nodelete
            )
        }
        return processed_flat;
    }

    /**
     * @param {import("../../ipc").BackupVariantList[]} lists 
     * @param {BackupSettings['list'][number]} rules
     * @param {string} [mock_date]
     */
    static process_backup_lists(lists, rules, mock_date) {
        const date_now = new BackupDate(mock_date).to_backup_string();

        const date_limits = {
            mon: new BackupDate(mock_date).add_month(-1).to_backup_string(),
            wee: new BackupDate(mock_date).add_day  (-7).to_backup_string(),
            day: new BackupDate(mock_date).add_day  (-1).to_backup_string(),
            std: "9999.99.99_99.99.99"
        }

        console.log('TEST DATES', date_now, date_limits);

        const variant_routine = (/**@type {string} */ name) => {
            const en  = rules[name + '_en'];
            if(!en) {
                return {
                    copy_to_create: [],
                    filepaths_to_delete: []
                }
            }
            const max = rules[name + '_max'];
            const variant = VARIANT_NAME_TO_DISPLAY[name];
            return this.process_backup_list(
                lists.find(x => x.name === variant)?.entries || [],
                max,
                date_limits[name],
                rules.path,
                variant,
                date_now
            );
        };

        const res = VARIANT_NAMES.map(variant_routine);
        return {
            copies_to_create:    res.map(x => x.copy_to_create).flat(),
            filepaths_to_delete: res.map(x => x.filepaths_to_delete).flat(),
        }
    }
    /**
     * 
     * @param {import("../../ipc").BackupVariantListEntry[]} entries 
     * @param {number} max 
     * @param {string} date_limit 
     * @param {string} path
     * @param {string} variant
     * @param {string} date_now
     */
    static process_backup_list(entries, max, date_limit, path, variant, date_now) {
        /**@type {string[]} */
        let filepaths_to_delete = [];
        /**@type {{path: string, variant: string, date: string}[]} */
        let copy_to_create = [];

        const should_create     = entries.every (x => x.date < date_limit) ? 1 : 0;
        const delete_candidates = entries.filter(x => x.date < date_now);

        if(should_create) {
            copy_to_create = [{path, variant, date: date_now}];
        }
        if(max > 0) {
            const sorted = delete_candidates.sort((a,b) => a.date > b.date ? -1 : a.date === b.date ? 0 : 1);
            const to_delete = sorted.filter((x, i) => i >= max - should_create);
            filepaths_to_delete = to_delete.map(x => x.path);
        }

        return {
            copy_to_create,
            filepaths_to_delete
        }
    }
}

function p4(val) { return pad(val, 4, '0'); }
function p2(val) { return pad(val, 2, '0'); }
class BackupDate extends Date {
    /**
     * @param {string} [date_str]
     */
    constructor(date_str) {
        if(date_str) super(date_str);
        else         super();
    }
    add_month(val) {this.setMonth(this.getMonth() + val); return this};
    add_day(val)   {this.setDate (this.getDate()  + val); return this};

    to_backup_string() {
        const part1 = [p4(this.getFullYear()), p2(this.getMonth() + 1), p2(this.getDate())].join('.');
        const part2 = [p2(this.getHours()),    p2(this.getMinutes()),   p2(this.getSeconds())].join('.');
        return part1 + '_' + part2;
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