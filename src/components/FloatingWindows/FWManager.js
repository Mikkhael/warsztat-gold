import { reactive, markRaw } from 'vue';

class FWManager {
    constructor(container) {
        this.container = container;
        // [title, zindex, dims]
        this.props = reactive([]);
        this.refs  = reactive({});
    }

    get_container_h() {
        return this.container.value.clientHeight;
    }
    get_container_w() {
        return this.container.value.clientWidth;
    }


    // Props modification
    open_window_unchecked(title, wis = 'div', wprops = {}, dims = {}){
        dims.w = dims?.w ?? this.get_container_w() / 2.5;
        dims.h = dims?.h ?? this.get_container_h() / 2.5;
        dims.x = dims?.x ?? (this.get_container_w() - dims.w) / 2;
        dims.y = dims?.y ?? (this.get_container_h() - dims.h) / 2;
        this.unfocus_all_by_1();
        this.props.push([title, 0, markRaw(wis), wprops, dims]);
    }
    close_window(title){
        const index = this.get_window_index(title);
        if(index !== -1){
            this.props.splice(index, 1);
            delete this.refs[title];
        } 
    }
    unfocus_all_by_1(){
        for(let i in this.props)
            this.props[i][1] -= 1;
    }

    // Other
    
    open_or_focus_window(title, wis, wprops, dims){
        const index = this.get_window_index(title);
        if(index === -1){
            this.open_window_unchecked(title, wis, wprops, dims);
        }else{
            this.focus_window_by_index(index);
        }
    }

    get_window_index(title) {
        return this.props.findIndex(w => w[0] === title);
    }
    
    get_window_ref(title){
        return this.refs[title];
    }
    
    focus_window_by_index(index){
        this.unfocus_all_by_1();
        this.props[index][1] = 0;
    }
    
    focus_window_by_title(title){
        const index = this.get_window_index(title);
        if(index !== -1) this.focus_window_by_index();
    }
    
    // open_or_reopen_window(title){
    //     const index = this.get_window_index(title);
    //     if(index !== -1)
    //         this.close_window(title);
    //     this.open_window_unchecked(title);
    // }
}

export default FWManager;