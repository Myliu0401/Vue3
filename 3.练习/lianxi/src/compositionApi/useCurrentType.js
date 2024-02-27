import { ref, onMounted, onUnmounted, computed } from 'vue';
import { removeTask, setTask } from '../utils/request.js';

export default function useCurrentType(taskList) {
    const regex = /^(#\/|\/|#)(.*)$/;
    const hash = location.hash.replace(regex, '$2');

    const types = ['all', 'active', 'unselected'];

    const hashRef = ref(types.includes(hash) ? hash : 'all');

    const setCurrentType = (type) => {
        hashRef.value = type;
        location.hash = `#${type}`;
    };

    const setHashRef = () => {
        let newHash = window.location.hash;
        newHash = newHash.replace(regex, '$2');
        newHash = types.includes(newHash) ? newHash : 'all';
        hashRef.value = newHash;
    };


    onMounted(() => {
        window.addEventListener('hashchange', setHashRef);
    });

    onUnmounted(() => {
        window.removeEventListener('hashchange', setHashRef);
    });

    const taskLengthRef = computed(() => {
        if (hashRef.value === 'all') {
            return taskList.length;
        } else if (hashRef.value === 'active') {
            return taskList.filter(task => task.completed).length;
        } else if (hashRef.value === 'unselected') {
            return taskList.filter(task => !task.completed).length;
        };
    });

    const listRef = computed(() => {
        if (hashRef.value === 'all') {
            return taskList;
        } else if (hashRef.value === 'active') {
            return taskList.filter(task => task.completed);
        } else if (hashRef.value === 'unselected') {
            return taskList.filter(task => !task.completed);
        };
    });

    const isBUtRef = computed(() => {

        for (let i = 0; i < listRef.value.length; i++) {
            const bol = listRef.value[i].completed;
            if (!bol) {
                return true
            }
        }

        return false;
    });


    const clearIncomplete = () => {
        const s = [];
        for (let i = 0; i < listRef.value.length; i++) {
            const item = listRef.value[i];
            if (!item.completed) {
                s.push(item.id);
              
            };
        };

        for (let i = 0; i < s.length; i++) {
            const index = taskList.map((item) => { return item.id }).indexOf(s[i]);
            taskList.splice(index, 1);
            removeTask(s[i]);
        }
    };

    const selectAll = computed(()=>{
        if(hashRef.value === 'all'){
               return true
        };


        for(let i=0;i < listRef.value.length;i++){
            const item = listRef.value[i];
            if(!item.completed){
                return false
            }
        };

        return listRef.value.length && true
    });


    return {
        currentType: hashRef,
        setCurrentType,
        taskLength: taskLengthRef,
        list: listRef,
        isBUt: isBUtRef,
        clearIncomplete,
        selectAll,
    }

};