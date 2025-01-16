//@ts-check
import fs from 'fs';
import path from 'path';
import { exec as exec_raw} from 'child_process';
import { promisify } from 'util';
const exec = promisify(exec_raw);

const LOCAL_BUNDLES_PATH  = import.meta.dirname + "\\src-tauri\\target\\release\\bundle\\msi";

const REMOTE_SCP_TARGET = "mikrusgold";
const REMOTE_UPDATE_BUNDLES_PATH = "/var/goldwww/warsztatgold/public/update_bundles/";
const REMOTE_UPDATE_SIGS_PATH    = "/var/goldwww/warsztatgold/public/update_sigs/";

const BUNDLE_REGEX = /^warsztat-gold_(\d+\.\d+\.\d+)_x64_pl-PL\.msi$/;
const BUNDLE_UPDATER_EXT = '.zip';
const BUNDLE_SIG_EXT     = '.zip.sig';

function get_newest_bundle_name() {
    /**@type {string} */
    //@ts-ignore
    const newest_bundle_name = fs.readdirSync(LOCAL_BUNDLES_PATH, {withFileTypes: true})
        .filter(x => x.isFile() && x.name.match(BUNDLE_REGEX))
        .reduce(([last_time, last_name], x) => {
            const full_path = path.join(LOCAL_BUNDLES_PATH, x.name);
            const new_time  = fs.statSync(full_path).mtime;
            if( last_name === '' || new_time > last_time ) {
                return [new_time, x.name];
            }
            return [last_time, last_name];
        }, [new Date(), ''])?.[1];
    console.log(newest_bundle_name);
    return newest_bundle_name;
}

function get_files_to_upload() {
    const name = get_newest_bundle_name();
    if(name === '') return null;
    const updater = name + BUNDLE_UPDATER_EXT;
    const sig     = name + BUNDLE_SIG_EXT;
    return {updater, sig};
}

async function upload_file(/**@type {string}*/ name, /**@type {string}*/ remote_dir) {
    const local_path  = path.join(LOCAL_BUNDLES_PATH, name);
    const remote_path = REMOTE_SCP_TARGET + ":" + remote_dir + name.replaceAll('\\', '/');
    console.log();
    console.log(`scp -B ${local_path} ${remote_path}`);
    console.log();
    const {stdout, stderr} = await exec(`scp -B ${local_path} ${remote_path}`);
    console.log(stdout);
    if(stderr) {
        console.error(stderr);
    }
} 

async function main() {
    const to_upload_names = get_files_to_upload();
    if(!to_upload_names) {
        console.log("NO FILES TO UPLOAD!!!");
        return;
    }
    await upload_file(to_upload_names.updater, REMOTE_UPDATE_BUNDLES_PATH);
    await upload_file(to_upload_names.sig    , REMOTE_UPDATE_SIGS_PATH);
}

main().catch(err => {
    console.error(err);
});