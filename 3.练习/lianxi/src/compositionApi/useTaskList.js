
import { getList } from '../utils/request.js';
import { ref } from 'vue';

function useTaskList(){
    
    const taskList = getList();
    const taskListRef = ref(taskList);

    return {
        taskList: taskListRef,
    }
};

export default useTaskList;