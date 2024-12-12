//@ts-check
import { reactive, computed, unref, onMounted, watch, onUnmounted } from 'vue';
import { FWWindow } from './components/FloatingWindows/FWManager';
import ipc from './ipc';
import { appWindow } from '@tauri-apps/api/window';


class ClosePreventionManager{
    constructor() {
        this.preventors = reactive(/**@type {Set<import('vue').Ref<boolean>>} */ (new Set()));
        this.should_prevent = computed(() => {
            for(const preventor of this.preventors) {
                if(unref(preventor)) return true;
            }
            return false;
        });
    }

    static async confirm_unsaved_changed() {
            const confirmed = await window.confirm('Posiadasz niezapisane zmiany. Czy chesz zamnknąć okno?');
            return !confirmed;
    }

    /**
     * 
     * @param {import('vue').Ref<boolean> | boolean} preventor 
     * @param {FWWindow} parent_window 
     */
    static prevent_fwwindow_close(preventor, parent_window) {
        if(parent_window) {
            parent_window?.add_before_close(async (force) => {
                if(force) return false;
                if(unref(preventor)){
                    return ClosePreventionManager.confirm_unsaved_changed();
                }
                return false;
            });
        }
    }

    /**
     * 
     * @param {import('vue').Ref<boolean>} preventor 
     * @param {FWWindow} [parent_window] 
     */
    start_in_component(preventor, parent_window) {
        console.log('CPM Started in component');
        onMounted(() => {
            this.preventors.add(preventor);
            if(parent_window) {
                ClosePreventionManager.prevent_fwwindow_close(preventor, parent_window);
            }
        });
        onUnmounted(() => {
            console.log("CPM Ended in component");
            this.preventors.delete(preventor);
        })
    }

    reset() {
        console.log('CPM Reset');
        return ipc.sync_close_prevention(false);
    }

    start_main_guard(on_before_close = async () => {}) {
        const unlisteners = {
            watch: () => {},
            event: () => {}
        };
        console.log("CPM starting event preventer");
        appWindow.onCloseRequested(async event => {
            console.log('CPM Close Request');
            if( this.should_prevent.value && 
                await ClosePreventionManager.confirm_unsaved_changed()) {
                    console.log('CPM Prevented Close');
                    event.preventDefault();
                    return;
            }
            await on_before_close();
        }).then(unlisten => unlisteners.event = unlisten);

        console.log("CPM starting watcher");
        unlisteners.watch = watch(this.should_prevent, (new_value) => {
            console.log("CPM Watcher", new_value);
            ipc.sync_close_prevention(new_value);
        });
        const unlisten_all = () => {
            // console.log('CPM Unlisteing');
            unlisteners.event();
            unlisteners.watch();
        }
        onUnmounted(() => {
            // console.log('CPM Unmounting main guard');
            unlisten_all();
        });
        return unlisten_all;
    }
}


const mainClosePreventionManager = new ClosePreventionManager();

function useMainClosePreventionManager() {
    return mainClosePreventionManager;
}

export {
    ClosePreventionManager,
    useMainClosePreventionManager
}
