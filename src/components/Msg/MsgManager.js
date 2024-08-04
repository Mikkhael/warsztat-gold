//@ts-check
import {ref, reactive} from 'vue'
import { generate_UID } from '../../utils';

/**@type {MsgManager?} */
let main_msg_manager = null;

class Msg {
    constructor(id, type = 'info', content = "", onclick = () => {}) {
        this.id = id;
        this.type = type;
        this.content = content;
        this.onclick = onclick;
    }
}

class MsgManager {
    constructor(is_main) {
        this.msgs = ref(/**@type {Msg[]} */ ([]));
        if(is_main) {
            main_msg_manager = this;
        }
    }

    static getMain() {
        return main_msg_manager;
    }

    /**
     * @param {string} type 
     * @param {string} content 
     * @param {number} timeout
     */
    post(type, content, timeout = 0, onclick = () => {}) {
        const id  = 'msg_uid_' + generate_UID();
        const msg = new Msg(id, type, content, onclick);
        this.msgs.value.push(msg);
        if(timeout > 0) {
            setTimeout(() => {
                this.close(id);
            }, timeout);
        }
    }

    /**
     * @param {string} id 
     */
    close(id) {
        const index = this.msgs.value.findIndex(x => x.id === id);
        if(index == -1)
            return false;
        this.msgs.value.splice(index, 1);
        return true;
    }


};

export default MsgManager;