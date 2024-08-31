//@ts-check
import { reactive } from 'vue'
import { generate_UID } from '../../utils';

class Msg {
    constructor(id, type = 'info', content = "", onclick = () => {}) {
        this.id = id;
        this.type = type;
        this.content = content;
        this.onclick = onclick;
    }
}

class MsgManager {
    constructor() {
        this.msgs = /**@type {Msg[]} */ ([]);
    }

    /**
     * @param {string} type 
     * @param {string} content 
     * @param {number} timeout
     */
    post(type, content, timeout = 0, onclick = () => {}) {
        const id  = 'msg_uid_' + generate_UID();
        const msg = new Msg(id, type, content, onclick);
        this.msgs.push(msg);
        if(timeout > 0) {
            setTimeout(() => {
                this.close(id);
            }, timeout);
        }
    }
    
    /**
     * @param {string | Error} err 
     * @param {number} timeout
     */
    postError(err, timeout = 0, onclick = () => {}) {
        console.error(err);
        if(typeof err === 'string'){
            return this.post('error', err, timeout, onclick);
        } else {
            return this.post('error', err.message, timeout, onclick);
        }
    }

    close_all_with_content(content) {
        this.msgs = this.msgs.filter(x => x.content !== content);
    }

    /**
     * @param {string} id 
     */
    close(id) {
        const index = this.msgs.findIndex(x => x.id === id);
        if(index == -1)
            return false;
        this.msgs.splice(index, 1);
        return true;
    }
};



/**@type {MsgManager} */
let main_msg_manager = reactive(new MsgManager());

function useMainMsgManager() {
    return main_msg_manager;
}


export {MsgManager, useMainMsgManager}
export default useMainMsgManager;